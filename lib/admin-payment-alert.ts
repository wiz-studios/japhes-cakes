import { sendSmtpMail } from "@/lib/smtp"
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

function parseRecipients(value?: string | null) {
  if (!value) return []
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getTransportConfig() {
  const host = process.env.EMAIL_HOST
  const port = Number(process.env.EMAIL_PORT || "")
  const secure = `${process.env.EMAIL_SECURE}`.toLowerCase() === "true"
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS
  const from = process.env.EMAIL_FROM
  const recipients = parseRecipients(
    process.env.ADMIN_PAYMENT_ALERT_TO ||
      process.env.ADMIN_ALERT_EMAIL ||
      process.env.EMAIL_TO ||
      process.env.ADMIN_EMAIL ||
      process.env.EMAIL_USER
  )

  if (!host || !port || !user || !pass || !from || recipients.length === 0) {
    return null
  }

  return { host, port, secure, user, pass, from, recipients }
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

function buildSubject(input: AdminPaymentAlertInput) {
  const ref = input.friendlyId || input.orderId
  const stage = input.paymentStatus === "paid" ? "fully paid" : "deposit received"
  return `Order ${ref} ${stage} (${formatKes(input.amountReceived)})`
}

function buildMessage(input: AdminPaymentAlertInput) {
  const reference = input.friendlyId || input.orderId
  const now = formatDateTimeNairobi(new Date())
  const paymentStage = input.paymentStatus === "paid" ? "Payment complete" : "Deposit paid"
  const baseUrl = getBaseUrl()
  const adminOrderUrl = baseUrl ? `${baseUrl}/admin/order/${input.orderId}` : ""
  const statusUrl = baseUrl && input.friendlyId ? `${baseUrl}/status?id=${encodeURIComponent(input.friendlyId)}` : ""

  return [
    "ADMIN PAYMENT ALERT",
    "-------------------",
    "",
    `Order Ref: ${reference}`,
    `Stage: ${paymentStage}`,
    `Amount Received: ${formatKes(input.amountReceived)}`,
    `Total Paid: ${formatKes(input.totalPaid)} / ${formatKes(input.totalAmount)}`,
    `Balance Due: ${formatKes(input.balanceDue)}`,
    `Method: M-Pesa (${input.source.toUpperCase()})`,
    `Transaction ID: ${input.transactionId || "N/A"}`,
    `Checkout Request ID: ${input.checkoutRequestId || "N/A"}`,
    `Customer: ${input.customerName || "N/A"}`,
    `Phone: ${input.contactPhone || "N/A"}`,
    "",
    "Links",
    `- Admin Order: ${adminOrderUrl || "N/A"}`,
    `- Customer Status: ${statusUrl || "N/A"}`,
    "",
    "Meta",
    `- Time (EAT): ${now}`,
    `- Request ID: ${input.requestId}`,
  ].join("\n")
}

export async function sendAdminPaymentAlert(input: AdminPaymentAlertInput) {
  if (!isAlertEnabled()) return

  const config = getTransportConfig()
  if (!config) {
    console.warn(`[${input.requestId}] [PAYMENT-ALERT] Email transport or recipient not configured`)
    return
  }

  const subject = buildSubject(input)
  const text = buildMessage(input)

  for (const recipient of config.recipients) {
    try {
      await sendSmtpMail({
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        pass: config.pass,
        from: config.from,
        to: recipient,
        subject,
        text,
      })
    } catch (error) {
      console.error(`[${input.requestId}] [PAYMENT-ALERT] Failed for ${recipient}`, error)
    }
  }
}
