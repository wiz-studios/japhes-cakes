"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import {
  SCHOOL_GALLERY_CATEGORIES,
  type SchoolGalleryCategory,
  type SchoolGalleryItem,
} from "@/lib/school-gallery"

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

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

function isValidCategory(value: string): value is SchoolGalleryCategory {
  return (SCHOOL_GALLERY_CATEGORIES as readonly string[]).includes(value)
}

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
}

function extractStoragePath(publicUrl: string) {
  const marker = "/school-gallery/"
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}

export async function listSchoolGalleryAdmin() {
  const { client: supabase, error: clientError } = getAdminSupabase()
  if (!supabase) {
    return { success: false, error: clientError || "Failed to initialize Supabase.", data: [] as SchoolGalleryItem[] }
  }

  const { data, error } = await supabase
    .from("school_gallery")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) {
    return { success: false, error: error.message, data: [] as SchoolGalleryItem[] }
  }

  return { success: true, data: (data || []) as SchoolGalleryItem[] }
}

export async function createSchoolGalleryItem(formData: FormData) {
  const title = String(formData.get("title") || "").trim()
  const category = String(formData.get("category") || "").trim()
  const sortOrder = Number(formData.get("sort_order") || 0)
  const isFeatured = String(formData.get("is_featured") || "false") === "true"
  const imageFile = formData.get("image")

  if (!title) return { success: false, error: "Title is required." }
  if (!isValidCategory(category)) return { success: false, error: "Invalid category." }
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return { success: false, error: "Image is required." }
  }
  if (imageFile.size > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: "Image must be 2MB or smaller." }
  }
  if (!ALLOWED_TYPES.has(imageFile.type)) {
    return { success: false, error: "Only JPG, PNG, and WEBP are allowed." }
  }

  const { client: supabase, error: clientError } = getAdminSupabase()
  if (!supabase) return { success: false, error: clientError || "Failed to initialize Supabase." }

  const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg"
  const safeName = sanitizeFileName(imageFile.name || title || "gallery")
  const filePath = `${new Date().getFullYear()}/${Date.now()}-${safeName}.${ext}`

  const bytes = await imageFile.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from("school-gallery")
    .upload(filePath, bytes, {
      contentType: imageFile.type,
      upsert: false,
    })

  if (uploadError) {
    return { success: false, error: uploadError.message }
  }

  const { data: urlData } = supabase.storage.from("school-gallery").getPublicUrl(filePath)
  const publicUrl = urlData.publicUrl

  const { error: insertError } = await supabase.from("school_gallery").insert({
    title,
    category,
    image_url: publicUrl,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    is_featured: isFeatured,
    is_visible: true,
    updated_at: new Date().toISOString(),
  })

  if (insertError) {
    await supabase.storage.from("school-gallery").remove([filePath])
    return { success: false, error: insertError.message }
  }

  revalidatePath("/school")
  revalidatePath("/admin/school-gallery")
  return { success: true }
}

export async function updateSchoolGalleryItem(input: {
  id: string
  title: string
  category: string
  sort_order: number
  is_featured: boolean
  is_visible: boolean
}) {
  if (!input.id) return { success: false, error: "Missing item id." }
  if (!input.title.trim()) return { success: false, error: "Title is required." }
  if (!isValidCategory(input.category)) return { success: false, error: "Invalid category." }

  const { client: supabase, error: clientError } = getAdminSupabase()
  if (!supabase) return { success: false, error: clientError || "Failed to initialize Supabase." }

  const { error } = await supabase
    .from("school_gallery")
    .update({
      title: input.title.trim(),
      category: input.category,
      sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 0,
      is_featured: input.is_featured,
      is_visible: input.is_visible,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/school")
  revalidatePath("/admin/school-gallery")
  return { success: true }
}

export async function deleteSchoolGalleryItem(id: string) {
  if (!id) return { success: false, error: "Missing item id." }
  const { client: supabase, error: clientError } = getAdminSupabase()
  if (!supabase) return { success: false, error: clientError || "Failed to initialize Supabase." }

  const { data: item, error: findError } = await supabase
    .from("school_gallery")
    .select("image_url")
    .eq("id", id)
    .single()

  if (findError) return { success: false, error: findError.message }

  const { error: deleteError } = await supabase
    .from("school_gallery")
    .delete()
    .eq("id", id)

  if (deleteError) return { success: false, error: deleteError.message }

  const path = extractStoragePath(item.image_url)
  if (path) {
    await supabase.storage.from("school-gallery").remove([path])
  }

  revalidatePath("/school")
  revalidatePath("/admin/school-gallery")
  return { success: true }
}
