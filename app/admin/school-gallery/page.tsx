import SchoolGalleryManager from "@/components/admin/SchoolGalleryManager"
import { listSchoolGalleryAdmin } from "@/app/actions/school-gallery"
import type { SchoolGalleryItem } from "@/lib/school-gallery"

export default async function AdminSchoolGalleryPage() {
  const result = await listSchoolGalleryAdmin()
  const items: SchoolGalleryItem[] = result.success ? result.data : []

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Admin Gallery</p>
        <h1 className="text-3xl font-semibold text-slate-900 font-serif">School Photos</h1>
        <p className="mt-2 text-sm text-slate-600">
          Upload student photos, cakes, pizzas, and class sessions for the public School page.
        </p>
      </div>

      {!result.success && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {result.error || "Could not load school gallery items."}
        </div>
      )}

      <SchoolGalleryManager initialItems={items} />
    </div>
  )
}
