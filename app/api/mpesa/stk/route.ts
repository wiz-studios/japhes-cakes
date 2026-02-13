import { NextResponse } from "next/server"
import { initiateMpesaSTK } from "@/lib/mpesa"

type StkInitBody = {
  orderId?: string
  phone?: string
  amount?: number
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StkInitBody
    if (!body?.orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 })
    }
    if (!body?.phone) {
      return NextResponse.json({ error: "phone required" }, { status: 400 })
    }

    // Amount is validated server-side from the order record for security.
    const result = await initiateMpesaSTK(body.orderId, body.phone)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "STK request failed" }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      checkoutRequestId: result.checkoutRequestId,
      merchantRequestId: result.merchantRequestId,
      customerMessage: result.customerMessage,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unknown error" }, { status: 500 })
  }
}
