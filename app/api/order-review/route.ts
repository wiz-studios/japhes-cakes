import { NextResponse } from "next/server"
import { z } from "zod"
import { createServiceSupabaseClient } from "@/lib/supabase-service"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp, getRequestId } from "@/lib/request-meta"

const reviewSchema = z.object({
  orderId: z.string().uuid("Invalid order id."),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  comment: z.string().trim().max(1200, "Comment is too long.").optional(),
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const ip = getClientIp(request)

  try {
    const limit = checkRateLimit(`order-review:${ip}`, 4, 10 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, message: "Too many review attempts. Please try again later.", requestId },
        { status: 429 }
      )
    }

    const payload = await request.json()
    const parsed = reviewSchema.safeParse(payload)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid review payload."
      return NextResponse.json({ ok: false, message, requestId }, { status: 400 })
    }

    const supabase = createServiceSupabaseClient()
    const { orderId } = parsed.data
    const rating = typeof parsed.data.rating === "number" ? parsed.data.rating : null
    const comment = (parsed.data.comment || "").trim()

    if (rating === null && comment.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Add a rating or comment before submitting.", requestId },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .maybeSingle()

    if (orderError) {
      return NextResponse.json(
        { ok: false, message: "Unable to verify this order right now.", requestId },
        { status: 500 }
      )
    }

    if (!order) {
      return NextResponse.json({ ok: false, message: "Order not found.", requestId }, { status: 404 })
    }

    const now = new Date().toISOString()
    const { error: upsertError } = await supabase.from("order_reviews").upsert(
      {
        order_id: order.id,
        rating,
        comment: comment.length > 0 ? comment : null,
        submitted_from: "order_submitted",
        updated_at: now,
      },
      { onConflict: "order_id" }
    )

    if (upsertError) {
      return NextResponse.json(
        { ok: false, message: "Could not save review right now. Please retry.", requestId },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, message: "Thanks for your feedback.", requestId })
  } catch (error) {
    console.error(`[${requestId}] [order-review] Failed to save review`, error)
    return NextResponse.json(
      { ok: false, message: "Could not save review right now. Please retry.", requestId },
      { status: 500 }
    )
  }
}
