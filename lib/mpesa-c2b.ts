import { createClient } from "@supabase/supabase-js"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type MpesaOrderRow = {
  id: string
  friendly_id: string | null
  payment_status: string | null
  payment_plan: string | null
  total_amount: number | string | null
  payment_amount_paid: number | string | null
  payment_amount_due: number | string | null
  payment_deposit_amount: number | string | null
  payment_last_request_amount: number | string | null
  payment_method: string | null
  mpesa_phone: string | null
  mpesa_transaction_id: string | null
}

const ORDER_PAYMENT_SELECT =
  "id, friendly_id, payment_status, payment_plan, total_amount, payment_amount_paid, payment_amount_due, payment_deposit_amount, payment_last_request_amount, payment_method, mpesa_phone, mpesa_transaction_id"

export function normalizeBillReference(value: unknown): string {
  return String(value ?? "").trim().toUpperCase()
}

export function parseMpesaAmount(value: unknown): number | null {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return null
  if (amount < 0) return null
  return amount
}

export function createMpesaServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
}

export async function findOrderByBillReference(
  supabase: ReturnType<typeof createMpesaServiceClient>,
  reference: string
): Promise<MpesaOrderRow | null> {
  const normalizedRef = normalizeBillReference(reference)
  if (!normalizedRef) return null

  if (UUID_REGEX.test(normalizedRef)) {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_PAYMENT_SELECT)
      .or(`friendly_id.eq.${normalizedRef},id.eq.${normalizedRef}`)
      .maybeSingle()

    if (error && error.code !== "PGRST116") throw error
    if (data) return data as MpesaOrderRow
  }

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_PAYMENT_SELECT)
    .eq("friendly_id", normalizedRef)
    .maybeSingle()

  if (error && error.code !== "PGRST116") throw error
  return (data as MpesaOrderRow | null) || null
}
