import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { formatDateTimeNairobi } from "@/lib/time"

type ReviewRow = {
  id: string
  order_id: string
  rating: number | null
  comment: string | null
  created_at: string
  orders: {
    friendly_id?: string | null
    order_type?: string | null
    payment_status?: string | null
    total_amount?: number | null
  } | null
}

function renderStars(rating: number) {
  const safe = Math.min(5, Math.max(1, rating))
  return `${safe}/5`
}

export default async function AdminReviewsPage() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("order_reviews")
    .select(
      "id, order_id, rating, comment, created_at, orders(friendly_id, order_type, payment_status, total_amount)"
    )
    .order("created_at", { ascending: false })
    .limit(300)

  const reviews = (data || []) as unknown as ReviewRow[]

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Customer Feedback</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Order Reviews</h1>
        <p className="mt-2 text-sm text-slate-600">
          Reviews left after checkout. Use this board to spot delivery and payment friction fast.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error.message || "Could not load reviews."}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Comment</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} className="border-b border-slate-100 align-top">
                <td className="px-4 py-3 text-slate-700">
                  <p className="font-semibold text-slate-900">{review.orders?.friendly_id || review.order_id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-slate-500">
                    {(review.orders?.order_type || "order").toUpperCase()} | {(review.orders?.payment_status || "unknown").replace(/_/g, " ")}
                  </p>
                  <Link href={`/admin/order/${review.order_id}`} className="mt-1 inline-block text-xs font-semibold text-slate-600 underline">
                    Open order
                  </Link>
                </td>
                <td className="px-4 py-3 font-semibold text-amber-600">
                  {typeof review.rating === "number" ? renderStars(review.rating) : "No rating"}
                </td>
                <td className="px-4 py-3 max-w-[460px] whitespace-pre-wrap text-slate-700">
                  {review.comment || "No comment"}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDateTimeNairobi(review.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!error && reviews.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">No reviews submitted yet.</div>
        ) : null}
      </div>
    </div>
  )
}
