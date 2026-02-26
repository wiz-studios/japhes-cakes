import { formatDateTimeNairobi } from "@/lib/time"

type PaymentStatus = "paid" | "deposit_paid"

type AdminPaymentAlertInput = {
  source: "stk" | "c2b"
  requestId: string
  orderId: string
  friendlyId?: string | null
  customerName?: string | null
  contactPhone?: string | null
  paymentStatus: PaymentStatus
  amountReceived: number
  totalAmount: number
  totalPaid: number
  balanceDue: number
  transactionId?: string | null
  checkoutRequestId?: string | null
}

type WhatsAppAlertConfig = {
  accessToken: string
  phoneNumberId: string
  apiVersion: string
  recipients: string[]
}

function parseList(value?: string | null) {
  if (!value) return []
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeRecipient(value: string) {
  const digits = value.replace(/\D/g, "")
  if (!digits) return null
  if (digits.startsWith("254") && digits.length === 12) return digits
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`
  if (digits.length === 9 && digits.startsWith("7")) return `254${digits}`
  if (digits.length >= 10 && digits.length <= 15) return digits
  return null
}

function getTransportConfig(): WhatsAppAlertConfig | null {
  const accessToken = (
    process.env.WHATSAPP_ALERT_ACCESS_TOKEN ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    ""
  ).trim()
  const phoneNumberId = (
    process.env.WHATSAPP_ALERT_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    ""
  ).trim()
  const apiVersion = (process.env.WHATSAPP_ALERT_API_VERSION || "v22.0").trim()

  const recipientsRaw = parseList(
    process.env.ADMIN_PAYMENT_ALERT_WHATSAPP_TO ||
      process.env.ADMIN_ALERT_WHATSAPP_TO ||
      process.env.ADMIN_ALERT_WHATSAPP ||
      process.env.ADMIN_WHATSAPP_TO
  )
  const recipients = Array.from(
    new Set(
      recipientsRaw
        .map((value) => normalizeRecipient(value))
        .filter((value): value is string => Boolean(value))
    )
  )

  if (!accessToken || !phoneNumberId || recipients.length === 0) {
    return null
  }

  return { accessToken, phoneNumberId, apiVersion, recipients }
}

function isAlertEnabled() {
  const raw = `${process.env.ENABLE_ADMIN_PAYMENT_ALERTS || "true"}`.trim().toLowerCase()
  return !["false", "0", "off", "no"].includes(raw)
}

function formatKes(value: number) {
  const amount = Number.isFinite(value) ? Math.max(value, 0) : 0
  return `${Math.round(amount).toLocaleString("en-KE")} KES`
}

function getBaseUrl() {
  const explicit = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ""
  ).trim()
  if (explicit) return explicit.replace(/\/+$/, "")

  const vercelHost = (
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    ""
  ).trim()
  if (!vercelHost) return ""
  const normalized = vercelHost.replace(/\/+$/, "")
  return normalized.startsWith("http://") || normalized.startsWith("https://")
    ? normalized
    : `https://${normalized}`
}

function buildMessage(input: AdminPaymentAlertInput) {
  const reference = input.friendlyId || input.orderId
  const now = formatDateTimeNairobi(new Date())
  const paymentStage = input.paymentStatus === "paid" ? "Payment complete" : "Deposit paid"
  const baseUrl = getBaseUrl()
  const adminOrderUrl = baseUrl ? `${baseUrl}/admin/order/${input.orderId}` : ""
  const statusUrl = baseUrl && input.friendlyId ? `${baseUrl}/status?id=${encodeURIComponent(input.friendlyId)}` : ""

  return [
    `Japhe's Cakes Payment Alert`,
    `Order: ${reference}`,
    `Stage: ${paymentStage}`,
    `Received: ${formatKes(input.amountReceived)}`,
    `Paid: ${formatKes(input.totalPaid)} / ${formatKes(input.totalAmount)}`,
    `Balance: ${formatKes(input.balanceDue)}`,
    `Method: M-Pesa ${input.source.toUpperCase()}`,
    `Txn: ${input.transactionId || "N/A"}`,
    `Checkout: ${input.checkoutRequestId || "N/A"}`,
    `Customer: ${input.customerName || "N/A"}`,
    `Phone: ${input.contactPhone || "N/A"}`,
    `Admin: ${adminOrderUrl || "N/A"}`,
    `Status: ${statusUrl || "N/A"}`,
    `Time (EAT): ${now}`,
    `Req: ${input.requestId}`,
  ].join("\n")
}

async function sendWhatsAppAlert(
  config: WhatsAppAlertConfig,
  recipient: string,
  message: string,
  requestId: string
) {
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "text",
      text: { body: message, preview_url: false },
    }),
  })

  if (response.ok) return

  let details = ""
  try {
    details = await response.text()
  } catch {
    details = "no response body"
  }

  throw new Error(
    `[${requestId}] WhatsApp alert failed (${response.status} ${response.statusText}) -> ${recipient}: ${details}`
  )
}

export async function sendAdminPaymentAlert(input: AdminPaymentAlertInput) {
  if (!isAlertEnabled()) return

  const config = getTransportConfig()
  if (!config) {
    console.warn(
      `[${input.requestId}] [PAYMENT-ALERT] WhatsApp transport not configured. Set WHATSAPP_ALERT_ACCESS_TOKEN, WHATSAPP_ALERT_PHONE_NUMBER_ID, ADMIN_PAYMENT_ALERT_WHATSAPP_TO`
    )
    return
  }

  const message = buildMessage(input)

  for (const recipient of config.recipients) {
    try {
      await sendWhatsAppAlert(config, recipient, message, input.requestId)
    } catch (error) {
      console.error(`[${input.requestId}] [PAYMENT-ALERT] Failed for ${recipient}`, error)
    }
  }
}
