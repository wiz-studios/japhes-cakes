import crypto from "node:crypto"

type WebhookVerifyResult = {
  ok: boolean
  reason?: string
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function getSharedSecret(request: Request): string | null {
  const headerValue =
    request.headers.get("x-webhook-secret") ||
    request.headers.get("x-callback-secret") ||
    request.headers.get("x-register-secret")

  const explicitHeader = headerValue?.trim()
  if (explicitHeader) return explicitHeader

  const authHeader = request.headers.get("authorization")?.trim()
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim()
  }

  try {
    const requestUrl = new URL(request.url)
    const querySecret =
      requestUrl.searchParams.get("token") ||
      requestUrl.searchParams.get("secret") ||
      requestUrl.searchParams.get("webhook_secret")

    const normalizedQuerySecret = querySecret?.trim()
    if (normalizedQuerySecret) return normalizedQuerySecret
  } catch {
    // ignore malformed URL parsing
  }

  return null
}

function getSignature(request: Request): string | null {
  return (
    request.headers.get("x-mpesa-signature") ||
    request.headers.get("x-signature") ||
    request.headers.get("x-webhook-signature")
  )?.trim() || null
}

function shouldFailClosed(options: { failClosedInProduction?: boolean }) {
  if (options.failClosedInProduction === false) return false
  return process.env.NODE_ENV === "production"
}

export function verifyWebhookRequest(params: {
  request: Request
  rawBody: string
  sharedSecretEnv?: string
  signatureSecretEnv?: string
  requireSignature?: boolean
  failClosedInProduction?: boolean
}): WebhookVerifyResult {
  const sharedSecret = params.sharedSecretEnv?.trim()
  const signatureSecret = params.signatureSecretEnv?.trim()
  const failClosed = shouldFailClosed({ failClosedInProduction: params.failClosedInProduction })

  if (!sharedSecret && !signatureSecret) {
    if (failClosed) {
      return { ok: false, reason: "Webhook auth misconfigured: no shared/HMAC secret configured" }
    }
    return { ok: true }
  }

  let sharedSecretOk = false
  let signatureOk = false

  if (sharedSecret) {
    const received = getSharedSecret(params.request)
    if (!received) {
      sharedSecretOk = false
    } else {
      sharedSecretOk = safeEqual(received, sharedSecret)
    }
  }

  if (signatureSecret) {
    const receivedSignature = getSignature(params.request)
    if (!receivedSignature) {
      signatureOk = false
    } else {
      const digest = crypto.createHmac("sha256", signatureSecret).update(params.rawBody).digest("hex")
      signatureOk = safeEqual(receivedSignature.toLowerCase(), digest.toLowerCase())
    }
  }

  const requireSignature = params.requireSignature === true
  if (requireSignature) {
    if (!signatureSecret) {
      return { ok: false, reason: "Signature required but signature secret not configured" }
    }
    if (!signatureOk) {
      return { ok: false, reason: "Invalid HMAC signature" }
    }
    if (sharedSecret && !sharedSecretOk) {
      return { ok: false, reason: "Invalid shared secret" }
    }
    return { ok: true }
  }

  if (signatureSecret && sharedSecret) {
    if (!signatureOk) return { ok: false, reason: "Invalid HMAC signature" }
    if (!sharedSecretOk) return { ok: false, reason: "Invalid shared secret" }
    return { ok: true }
  }

  if (signatureSecret && !signatureOk) {
    return { ok: false, reason: "Invalid HMAC signature" }
  }
  if (sharedSecret && !sharedSecretOk) {
    return { ok: false, reason: "Invalid shared secret" }
  }

  return { ok: true }
}
