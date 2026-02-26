import { NextResponse } from "next/server"
import { expireStaleOrders } from "@/lib/cron/expire-orders"
import { verifyCronRequest } from "@/lib/cron-auth"
import { getRequestId } from "@/lib/request-meta"

// This endpoint should be secured (e.g., via a CRON_SECRET header) in production.
// For now we allow it to be called to demonstrate the functionality.

export async function GET(request: Request) {
    const requestId = getRequestId(request)
    const auth = verifyCronRequest(request)
    if (!auth.ok) {
        return NextResponse.json({ ok: false, error: "Unauthorized", requestId, reason: auth.reason }, { status: 401 })
    }

    try {
        const result = await expireStaleOrders()
        return NextResponse.json({ ok: true, requestId, result })
    } catch (err) {
        return NextResponse.json({ ok: false, requestId, error: "Internal Server Error" }, { status: 500 })
    }
}
