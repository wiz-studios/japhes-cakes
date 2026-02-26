"use client"

import { useMemo, useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDateTimeNairobi } from "@/lib/time"

type ReviewState = {
  rating: number | null
  comment: string | null
  created_at?: string | null
}

type OrderReviewFormProps = {
  orderId: string
  initialReview?: ReviewState | null
}

export default function OrderReviewForm({ orderId, initialReview = null }: OrderReviewFormProps) {
  const [rating, setRating] = useState<number | null>(initialReview?.rating ?? null)
  const [comment, setComment] = useState(initialReview?.comment ?? "")
  const [savedAt, setSavedAt] = useState<string | null>(initialReview?.created_at || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(
    initialReview ? "Anonymous review received. You can edit and resubmit." : null
  )

  const charsLeft = useMemo(() => 1200 - comment.length, [comment.length])
  const canSubmit = (comment.trim().length > 0 || rating !== null) && !isSubmitting

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/order-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          rating,
          comment: comment.trim(),
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string }
      if (!response.ok || !payload.ok) {
        setError(payload.message || "Could not save your review right now.")
        return
      }

      setMessage(payload.message || "Thanks for your feedback.")
      setSavedAt(new Date().toISOString())
    } catch {
      setError("Could not save your review right now.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_18px_50px_-40px_rgba(15,23,42,0.35)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Feedback</p>
      <h3 className="mt-2 font-serif text-xl font-semibold text-slate-900">Leave a quick review</h3>
      <p className="mt-1 text-sm text-slate-600">
        Optional and anonymous. Share a rating, a comment, or both. This goes directly to admin.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rating</p>
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className="rounded-md p-1.5 transition hover:bg-slate-100"
                aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
              >
                <Star
                  className={`h-5 w-5 ${rating !== null && value <= rating ? "fill-amber-400 text-amber-500" : "text-slate-300"}`}
                />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRating(null)}
              className="ml-1 rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100"
            >
              Clear
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="review-comment" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Comment
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value.slice(0, 1200))}
            placeholder="Great service, smooth payment, quick delivery..."
            className="mt-2 min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
            maxLength={1200}
          />
          <p className="mt-1 text-xs text-slate-500">{charsLeft} characters left</p>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
            {savedAt ? <span className="block text-xs mt-1">Saved: {formatDateTimeNairobi(savedAt)}</span> : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">No personal details are attached to this review.</p>
          <Button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800"
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </form>
    </div>
  )
}
