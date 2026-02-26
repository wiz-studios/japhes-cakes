import { NextResponse } from "next/server"
import { getRequestId } from "@/lib/request-meta"
import { reconcileMpesaPayments } from "@/lib/cron/reconcile-mpesa"
import { verifyCronRequest } from "@/lib/cron-auth"
import { runIdempotent } from "@/lib/idempotency"

function getNumberParam(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: Request) {
  const requestId = getRequestId(request)
  const auth = verifyCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized", requestId, reason: auth.reason }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const batchSize = getNumberParam(searchParams.get("batch"))
  const lookbackMinutes = getNumberParam(searchParams.get("lookbackMinutes"))
  const minuteBucket = Math.floor(Date.now() / 60_000)

  const guarded = await runIdempotent({
    scope: "cron:mpesa-reconcile",
    idempotencyKey: `bucket:${minuteBucket}`,
    ttlSeconds: 55,
    run: async () => {
      return reconcileMpesaPayments({
        requestId,
        batchSize,
        lookbackMinutes,
      })
    },
  })

  if (guarded.state === "in_progress") {
    return NextResponse.json(
      {
        ok: true,
        requestId,
        skipped: true,
        reason: "Reconcile run already in progress for this minute",
      },
      { status: 202 }
    )
  }

  return NextResponse.json({
    ok: true,
    requestId,
    deduped: guarded.state === "replay",
    result: guarded.result,
  })
}

