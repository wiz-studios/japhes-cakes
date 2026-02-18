"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import {
  isSchoolInquiryStatus,
  type SchoolInquiry,
  type SchoolInquiryStatus,
} from "@/lib/school-inquiries"

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { client: null, error: "Missing Supabase admin credentials." }
  }

  return {
    client: createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }),
    error: null,
  }
}

export async function listSchoolInquiriesAdmin() {
  const { client: supabase, error: clientError } = getAdminSupabase()
  if (!supabase) {
    return { success: false, error: clientError || "Failed to initialize Supabase.", data: [] as SchoolInquiry[] }
  }

  const { data, error } = await supabase
    .from("school_inquiries")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return { success: false, error: error.message, data: [] as SchoolInquiry[] }
  }

  return { success: true, data: (data || []) as SchoolInquiry[] }
}

export async function updateSchoolInquiryStatus(input: { id: string; status: string }) {
  if (!input.id) return { success: false, error: "Missing inquiry id." }
  if (!isSchoolInquiryStatus(input.status)) return { success: false, error: "Invalid inquiry status." }

  const { client: supabase, error: clientError } = getAdminSupabase()
  if (!supabase) return { success: false, error: clientError || "Failed to initialize Supabase." }

  const patch: {
    status: SchoolInquiryStatus
    updated_at: string
    last_contacted_at?: string
  } = {
    status: input.status,
    updated_at: new Date().toISOString(),
  }

  if (input.status === "contacted") {
    patch.last_contacted_at = new Date().toISOString()
  }

  const { error } = await supabase.from("school_inquiries").update(patch).eq("id", input.id)
  if (error) return { success: false, error: error.message }

  revalidatePath("/admin/school-inquiries")
  return { success: true }
}
