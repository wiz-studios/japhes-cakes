import { NextResponse } from "next/server"
import { expireStaleOrders } from "@/lib/cron/expire-orders"

// This endpoint should be secured (e.g., via a CRON_SECRET header) in production.
// For now we allow it to be called to demonstrate the functionality.

export async function GET(request: Request) {
    try {
        const result = await expireStaleOrders()
        return NextResponse.json(result)
    } catch (err) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
