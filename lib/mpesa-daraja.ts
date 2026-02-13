"use server"

import { toKenyaMsisdn } from "@/lib/phone"

type DarajaEnv = "sandbox" | "production"

export type DarajaStkResponse = {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

function getDarajaEnv(): DarajaEnv {
  return (process.env.MPESA_ENV || "sandbox") === "production" ? "production" : "sandbox"
}

function getDarajaBaseUrl(): string {
  return getDarajaEnv() === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke"
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
  const res = await fetch(
    `${getDarajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
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
  const shortcode = process.env.MPESA_SHORTCODE
  const passkey = process.env.MPESA_PASSKEY
  const callbackUrl = process.env.MPESA_CALLBACK_URL

  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error("Missing MPESA_SHORTCODE, MPESA_PASSKEY, or MPESA_CALLBACK_URL")
  }

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

  const res = await fetch(`${getDarajaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = (await res.json()) as DarajaStkResponse & { errorMessage?: string }
  if (!res.ok) {
    const message = data?.ResponseDescription || data?.errorMessage || "STK request failed"
    throw new Error(message)
  }

  return data
}
