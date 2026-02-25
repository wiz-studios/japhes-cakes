import { NextResponse } from "next/server"
import { initiateMpesaSTK } from "@/lib/mpesa"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp, getRequestId } from "@/lib/request-meta"

type StkInitBody = {
  orderId?: string
  phone?: string
  amount?: number
  idempotencyKey?: string
}

export async function POST(req: Request) {
  const requestId = getRequestId(req)
  const ip = getClientIp(req)

  try {
    const ipLimit = checkRateLimit(`stk-init:${ip}`, 10, 10 * 60 * 1000)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many payment attempts. Please wait before retrying.",
          requestId,
          retryAfterMs: ipLimit.retryAfterMs,
        },
        { status: 429 }
      )
    }

    const body = (await req.json()) as StkInitBody
    if (!body?.orderId) {
      return NextResponse.json({ error: "orderId required", requestId }, { status: 400 })
    }
    if (!body?.phone) {
      return NextResponse.json({ error: "phone required", requestId }, { status: 400 })
    }

    const perOrderLimit = checkRateLimit(`stk-init:order:${body.orderId}`, 4, 60 * 1000)
    if (!perOrderLimit.allowed) {
      return NextResponse.json(
        {
          error: "Payment request already in progress for this order. Please wait.",
          requestId,
          retryAfterMs: perOrderLimit.retryAfterMs,
        },
        { status: 429 }
      )
    }

    const result = await initiateMpesaSTK(body.orderId, body.phone, {
      idempotencyKey: body.idempotencyKey,
      correlationId: requestId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || "STK request failed", requestId }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      checkoutRequestId: result.checkoutRequestId,
      merchantRequestId: result.merchantRequestId,
      customerMessage: result.customerMessage,
      requestId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unknown error", requestId }, { status: 500 })
  }
}
