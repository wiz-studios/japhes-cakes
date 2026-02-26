"use server"

import { fetchWithTimeout } from "@/lib/http"
import { toKenyaMsisdn } from "@/lib/phone"

type DarajaEnv = "sandbox" | "production"

export type DarajaStkResponse = {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

export type DarajaStkQueryResponse = {
  MerchantRequestID?: string
  CheckoutRequestID?: string
  ResponseCode?: string
  ResponseDescription?: string
  ResultCode?: string | number
  ResultDesc?: string
  errorCode?: string
  errorMessage?: string
}

export type DarajaC2BRegisterResponse = {
  ConversationID?: string
  OriginatorCoversationID?: string
  ResponseDescription?: string
}

function getDarajaEnv(): DarajaEnv {
  return (process.env.MPESA_ENV || "sandbox") === "production" ? "production" : "sandbox"
}

function getDarajaBaseUrl(): string {
  return getDarajaEnv() === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke"
}

function getDarajaTimeoutMs(): number {
  const parsed = Number(process.env.MPESA_HTTP_TIMEOUT_MS || 5000)
  if (!Number.isFinite(parsed)) return 5000
  return Math.min(Math.max(parsed, 2000), 15000)
}

function firstConfigured(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

function getStkShortcode(): string {
  const shortcode = firstConfigured(
    process.env.MPESA_STK_SHORTCODE,
    process.env.MPESA_PAYBILL_SHORTCODE,
    process.env.MPESA_SHORTCODE
  )

  if (!shortcode) {
    throw new Error("Missing MPESA_STK_SHORTCODE/MPESA_PAYBILL_SHORTCODE/MPESA_SHORTCODE")
  }

  return shortcode
}

function getC2BShortcode(): string {
  const shortcode = firstConfigured(
    process.env.MPESA_C2B_SHORTCODE,
    process.env.MPESA_PAYBILL_SHORTCODE,
    process.env.MPESA_SHORTCODE
  )

  if (!shortcode) {
    throw new Error("Missing MPESA_C2B_SHORTCODE/MPESA_PAYBILL_SHORTCODE/MPESA_SHORTCODE")
  }

  return shortcode
}

function parseAbsoluteUrl(value: string, envName: string): string {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error(`${envName} must use http or https`)
    }
    return parsed.toString()
  } catch {
    throw new Error(`Invalid ${envName}: expected absolute URL`)
  }
}

function getDarajaTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  )
}

async function getDarajaAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY
  const secret = process.env.MPESA_CONSUMER_SECRET
  if (!key || !secret) throw new Error("Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET")

  const auth = Buffer.from(`${key}:${secret}`).toString("base64")
  const res = await fetchWithTimeout(
    `${getDarajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
      timeoutMs: getDarajaTimeoutMs(),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Daraja OAuth failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { access_token: string }
  if (!data.access_token) throw new Error("Daraja OAuth returned no access_token")
  return data.access_token
}

function buildDarajaPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64")
}

export async function initiateDarajaStkPush(params: {
  orderRef: string
  phone: string
  amount: number
}): Promise<DarajaStkResponse> {
  const shortcode = getStkShortcode()
  const passkey = process.env.MPESA_PASSKEY
  const callbackUrlRaw = process.env.MPESA_CALLBACK_URL

  if (!passkey || !callbackUrlRaw) {
    throw new Error("Missing MPESA_PASSKEY or MPESA_CALLBACK_URL")
  }
  const callbackUrl = parseAbsoluteUrl(callbackUrlRaw, "MPESA_CALLBACK_URL")

  const msisdn = toKenyaMsisdn(params.phone)
  if (!msisdn) {
    throw new Error("Invalid phone format. Use 07XXXXXXXX or 01XXXXXXXX")
  }

  const timestamp = getDarajaTimestamp()
  const password = buildDarajaPassword(shortcode, passkey, timestamp)
  const token = await getDarajaAccessToken()

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.floor(params.amount),
    PartyA: msisdn,
    PartyB: shortcode,
    PhoneNumber: msisdn,
    CallBackURL: callbackUrl,
    AccountReference: params.orderRef,
    TransactionDesc: `Order ${params.orderRef}`,
  }

  const res = await fetchWithTimeout(`${getDarajaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    timeoutMs: getDarajaTimeoutMs(),
  })

  const data = (await res.json()) as DarajaStkResponse & { errorMessage?: string }
  if (!res.ok) {
    const message = data?.ResponseDescription || data?.errorMessage || "STK request failed"
    throw new Error(message)
  }

  return data
}

export async function queryDarajaStkPushStatus(params: {
  checkoutRequestId: string
}): Promise<DarajaStkQueryResponse> {
  const checkoutRequestId = params.checkoutRequestId?.trim()
  if (!checkoutRequestId) {
    throw new Error("checkoutRequestId is required")
  }

  const shortcode = getStkShortcode()
  const passkey = process.env.MPESA_PASSKEY
  if (!passkey) {
    throw new Error("Missing MPESA_PASSKEY")
  }

  const timestamp = getDarajaTimestamp()
  const password = buildDarajaPassword(shortcode, passkey, timestamp)
  const token = await getDarajaAccessToken()

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  }

  const res = await fetchWithTimeout(`${getDarajaBaseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    timeoutMs: getDarajaTimeoutMs(),
  })

  const text = await res.text()
  let data: DarajaStkQueryResponse = {}
  if (text) {
    try {
      data = JSON.parse(text) as DarajaStkQueryResponse
    } catch {
      if (!res.ok) {
        throw new Error(`Daraja STK query failed: ${res.status} ${text}`)
      }
      data = { ResponseDescription: text }
    }
  }

  if (!res.ok) {
    const message = data.errorMessage || data.ResultDesc || data.ResponseDescription || "STK query failed"
    throw new Error(message)
  }

  return data
}

export async function registerDarajaC2BUrls(params?: {
  shortcode?: string
  confirmationUrl?: string
  validationUrl?: string
  responseType?: "Completed" | "Cancelled"
}): Promise<DarajaC2BRegisterResponse> {
  const shortcode = params?.shortcode?.trim() || getC2BShortcode()
  const responseType =
    params?.responseType ||
    (process.env.MPESA_C2B_RESPONSE_TYPE?.trim() === "Cancelled" ? "Cancelled" : "Completed")

  const confirmationUrlRaw = params?.confirmationUrl?.trim() || process.env.MPESA_C2B_CONFIRMATION_URL
  const validationUrlRaw = params?.validationUrl?.trim() || process.env.MPESA_C2B_VALIDATION_URL

  if (!confirmationUrlRaw || !validationUrlRaw) {
    throw new Error("Missing MPESA_C2B_CONFIRMATION_URL or MPESA_C2B_VALIDATION_URL")
  }

  const confirmationUrl = parseAbsoluteUrl(confirmationUrlRaw, "MPESA_C2B_CONFIRMATION_URL")
  const validationUrl = parseAbsoluteUrl(validationUrlRaw, "MPESA_C2B_VALIDATION_URL")
  const token = await getDarajaAccessToken()

  const payload = {
    ShortCode: shortcode,
    ResponseType: responseType,
    ConfirmationURL: confirmationUrl,
    ValidationURL: validationUrl,
  }

  const res = await fetchWithTimeout(`${getDarajaBaseUrl()}/mpesa/c2b/v1/registerurl`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    timeoutMs: getDarajaTimeoutMs(),
  })

  const text = await res.text()
  let data: DarajaC2BRegisterResponse & { errorMessage?: string } = {}

  if (text) {
    try {
      data = JSON.parse(text) as DarajaC2BRegisterResponse & { errorMessage?: string }
    } catch {
      if (!res.ok) {
        throw new Error(`Daraja C2B register failed: ${res.status} ${text}`)
      }
      data = { ResponseDescription: text }
    }
  }

  if (!res.ok) {
    const message = data?.ResponseDescription || data?.errorMessage || "C2B register request failed"
    throw new Error(message)
  }

  return data
}
