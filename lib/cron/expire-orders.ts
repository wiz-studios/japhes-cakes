import { createClient } from "@supabase/supabase-js"
import { PAYMENT_CONFIG } from "@/lib/config/payments"

export async function expireStaleOrders() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )

    // Timeout window: 10 minutes (600,000 ms)
    const TIMEOUT_MS = 10 * 60 * 1000
    const cutoffTime = new Date(Date.now() - TIMEOUT_MS).toISOString()

    // 1. Find stale initiated orders
    // created_at is good, but if we have an 'updated_at' that reflects initiation time, better.
    // Assuming created_at for now or the time they were initiated.
    // Ideally, we'd have `initiated_at`. 
    // Let's rely on updated_at or created_at if payment_status is 'initiated'.

    // Safety check: Don't expire if 'created_at' is missing, but Supabase usually has it.
    const { data: staleOrders, error: findError } = await supabase
        .from("orders")
        .select("id, created_at, payment_status")
        .eq("payment_status", "initiated")
        .lt("created_at", cutoffTime) // Orders older than 10 mins

    if (findError) {
        console.error("Error finding stale orders:", findError)
        return { success: false, error: findError }
    }

    if (!staleOrders || staleOrders.length === 0) {
        return { success: true, count: 0 }
    }

    console.log(`Found ${staleOrders.length} stale initiated orders. Expiring...`)

    // 2. Mark as failed
    const idsToFail = staleOrders.map(o => o.id)

    const { error: updateError } = await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .in("id", idsToFail)

    if (updateError) {
        console.error("Error updating stale orders:", updateError)
        return { success: false, error: updateError }
    }

    return { success: true, count: staleOrders.length }
}
