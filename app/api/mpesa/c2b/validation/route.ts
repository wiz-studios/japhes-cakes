import { NextResponse } from "next/server"
import {
  createMpesaServiceClient,
  findOrderByBillReference,
  normalizeBillReference,
} from "@/lib/mpesa-c2b"
import { verifyWebhookRequest } from "@/lib/webhook-auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp, getRequestId } from "@/lib/request-meta"

function c2bValidationResponse(ResultCode: number, ResultDesc: string) {
  return NextResponse.json({ ResultCode, ResultDesc })
}

function requireOrderMatch(): boolean {
  const raw = process.env.MPESA_C2B_REQUIRE_ORDER_MATCH?.trim().toLowerCase()
  return raw !== "false" && raw !== "0" && raw !== "no"
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const ip = getClientIp(request)

  try {
    const limit = checkRateLimit(`mpesa-c2b-validation:${ip}`, 300, 60 * 1000)
    if (!limit.allowed) {
      return c2bValidationResponse(1, `Rate limit exceeded (${requestId})`)
    }

    const rawBody = await request.text()
    const webhookAuth = verifyWebhookRequest({
      request,
      rawBody,
      sharedSecretEnv: process.env.MPESA_C2B_CALLBACK_SECRET || process.env.MPESA_CALLBACK_SECRET,
      signatureSecretEnv:
        process.env.MPESA_C2B_CALLBACK_HMAC_SECRET || process.env.MPESA_CALLBACK_HMAC_SECRET,
      failClosedInProduction: true,
    })

    if (!webhookAuth.ok) {
      console.warn(`[${requestId}] [C2B-VALIDATION] Webhook auth failed: ${webhookAuth.reason || "unknown"}`)
      return c2bValidationResponse(1, "Unauthorized callback")
    }

    const payload = rawBody ? JSON.parse(rawBody) : {}
    const billRef = normalizeBillReference(payload?.BillRefNumber || payload?.AccountReference)

    if (!billRef) {
      return c2bValidationResponse(1, "BillRefNumber is required")
    }

    if (!requireOrderMatch()) {
      return c2bValidationResponse(0, "Accepted")
    }

    const supabase = createMpesaServiceClient()
    const order = await findOrderByBillReference(supabase, billRef)

    if (!order) {
      return c2bValidationResponse(1, "Invalid Account Reference")
    }

    return c2bValidationResponse(0, "Accepted")
  } catch (error) {
    console.error(`[${requestId}] [C2B-VALIDATION] Error:`, error)
    return c2bValidationResponse(1, "Validation failed")
  }
}
