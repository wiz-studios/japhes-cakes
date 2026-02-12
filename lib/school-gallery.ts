export const SCHOOL_GALLERY_CATEGORIES = [
  "students",
  "cakes",
  "pizza",
  "class",
] as const

export type SchoolGalleryCategory = (typeof SCHOOL_GALLERY_CATEGORIES)[number]

export type SchoolGalleryItem = {
  id: string
  title: string
  category: SchoolGalleryCategory
  image_url: string
  sort_order: number
  is_featured: boolean
  is_visible: boolean
  created_at: string
  updated_at: string
}

export const SCHOOL_GALLERY_CATEGORY_LABELS: Record<SchoolGalleryCategory, string> = {
  students: "Student Moments",
  cakes: "Cake Works",
  pizza: "Pizza Works",
  class: "Class in Progress",
}
