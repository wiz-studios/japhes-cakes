import dynamic from "next/dynamic"
import { createServiceSupabaseClient } from "@/lib/supabase-service"
const HomeHero = dynamic(() => import("@/components/HomeHero"))
export const revalidate = 300

type HomeReviewRow = {
  id: string
  rating: number | null
  comment: string | null
  created_at: string
  orders:
    | {
        order_type?: string | null
        payment_status?: string | null
      }
    | Array<{
        order_type?: string | null
        payment_status?: string | null
      }>
    | null
}

type HomeReview = {
  id: string
  rating: number | null
  comment: string
  orderType: "pizza" | "cake" | "order"
}

async function getHomeReviews(): Promise<HomeReview[]> {
  try {
    const supabase = createServiceSupabaseClient()
    const { data, error } = await supabase
      .from("order_reviews")
      .select("id, rating, comment, created_at, orders(order_type, payment_status)")
      .order("created_at", { ascending: false })
      .limit(40)

    if (error || !data) return []

    const reviews = (data as HomeReviewRow[])
      .flatMap((row): HomeReview[] => {
        const order = Array.isArray(row.orders) ? row.orders[0] : row.orders
        const paymentStatus = String(order?.payment_status || "").toLowerCase()
        const orderTypeRaw = String(order?.order_type || "").toLowerCase()
        const orderType: "pizza" | "cake" | "order" =
          orderTypeRaw === "pizza" || orderTypeRaw === "cake" ? orderTypeRaw : "order"
        const rating =
          typeof row.rating === "number" && Number.isFinite(row.rating)
            ? Math.max(1, Math.min(5, Math.round(row.rating)))
            : null
        const comment = (row.comment || "").trim()

        const paidEnough = paymentStatus === "paid" || paymentStatus === "deposit_paid" || paymentStatus === ""
        const hasContent = Boolean(rating) || comment.length >= 8
        if (!paidEnough || !hasContent) return []

        return [
          {
            id: row.id,
            rating,
            comment,
            orderType,
          },
        ]
      })
      .slice(0, 6)

    return reviews
  } catch {
    return []
  }
}

export default async function HomePage() {
  const reviews = await getHomeReviews()
  return <HomeHero reviews={reviews} />
}
