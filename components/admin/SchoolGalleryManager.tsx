"use client"

import Image from "next/image"
import { type FormEvent, useMemo, useState, useTransition } from "react"
import {
  createSchoolGalleryItem,
  deleteSchoolGalleryItem,
  listSchoolGalleryAdmin,
  updateSchoolGalleryItem,
} from "@/app/actions/school-gallery"
import {
  SCHOOL_GALLERY_CATEGORIES,
  SCHOOL_GALLERY_CATEGORY_LABELS,
  type SchoolGalleryItem,
} from "@/lib/school-gallery"

type Props = {
  initialItems: SchoolGalleryItem[]
}

const DEFAULT_CREATE_FORM = {
  title: "",
  category: "students",
  sort_order: 0,
  is_featured: false,
}

export default function SchoolGalleryManager({ initialItems }: Props) {
  const [items, setItems] = useState<SchoolGalleryItem[]>(initialItems)
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM)
  const [createFile, setCreateFile] = useState<File | null>(null)
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [busyRowId, setBusyRowId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }),
    [items]
  )

  const refreshItems = () => {
    startTransition(async () => {
      const result = await listSchoolGalleryAdmin()
      if (!result.success) {
        setStatus({ type: "error", text: result.error || "Failed to refresh gallery items." })
        return
      }
      setItems(result.data)
    })
  }

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)

    if (!createFile) {
      setStatus({ type: "error", text: "Select an image before adding an item." })
      return
    }

    const formData = new FormData()
    formData.set("title", createForm.title)
    formData.set("category", createForm.category)
    formData.set("sort_order", String(createForm.sort_order))
    formData.set("is_featured", createForm.is_featured ? "true" : "false")
    formData.set("image", createFile)

    const result = await createSchoolGalleryItem(formData)
    if (!result.success) {
      setStatus({ type: "error", text: result.error || "Could not create gallery item." })
      return
    }

    setCreateForm(DEFAULT_CREATE_FORM)
    setCreateFile(null)
    setStatus({ type: "success", text: "Gallery item added." })
    refreshItems()
  }

  const onSaveItem = async (item: SchoolGalleryItem) => {
    setStatus(null)
    setBusyRowId(item.id)

    const result = await updateSchoolGalleryItem({
      id: item.id,
      title: item.title,
      category: item.category,
      sort_order: Number(item.sort_order) || 0,
      is_featured: item.is_featured,
      is_visible: item.is_visible,
    })

    setBusyRowId(null)

    if (!result.success) {
      setStatus({ type: "error", text: result.error || "Could not save changes." })
      return
    }

    setStatus({ type: "success", text: "Item updated." })
    refreshItems()
  }

  const onDeleteItem = async (item: SchoolGalleryItem) => {
    const confirmed = window.confirm(`Delete "${item.title}"?`)
    if (!confirmed) return

    setStatus(null)
    setBusyRowId(item.id)
    const result = await deleteSchoolGalleryItem(item.id)
    setBusyRowId(null)

    if (!result.success) {
      setStatus({ type: "error", text: result.error || "Could not delete item." })
      return
    }

    setStatus({ type: "success", text: "Item deleted." })
    setItems((prev) => prev.filter((row) => row.id !== item.id))
  }

  const setItemField = <K extends keyof SchoolGalleryItem>(id: string, field: K, value: SchoolGalleryItem[K]) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_25px_65px_-45px_rgba(15,23,42,0.4)]">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Add Photo</p>
          <h3 className="text-xl font-semibold text-slate-900 font-serif">Upload a school gallery image</h3>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={onCreate}>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Title</span>
            <input
              required
              value={createForm.title}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-0 transition focus:border-slate-400"
              placeholder="Example: Buttercream class practical"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Category</span>
            <select
              value={createForm.category}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, category: e.target.value as (typeof SCHOOL_GALLERY_CATEGORIES)[number] }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition focus:border-slate-400"
            >
              {SCHOOL_GALLERY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {SCHOOL_GALLERY_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Sort Order</span>
            <input
              type="number"
              value={createForm.sort_order}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-0 transition focus:border-slate-400"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Image (JPG, PNG, WEBP up to 2MB)</span>
            <input
              required
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-700"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={createForm.is_featured}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, is_featured: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            Mark as featured (shows in top section on School page)
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isPending ? "Uploading..." : "Add Image"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={refreshItems}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
        </form>
      </section>

      {status && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {status.text}
        </div>
      )}

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Existing Images</p>
          <h3 className="text-xl font-semibold text-slate-900 font-serif">Manage gallery visibility and order</h3>
        </div>

        {sortedItems.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-600">
            No gallery images yet. Add the first image above.
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedItems.map((item) => (
              <article
                key={item.id}
                className="rounded-[24px] border border-white/70 bg-white p-4 shadow-[0_22px_60px_-50px_rgba(15,23,42,0.35)] md:p-5"
              >
                <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                  <div className="relative h-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 md:h-36">
                    <Image src={item.image_url} alt={item.title} fill className="object-cover" sizes="200px" />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Title</span>
                      <input
                        value={item.title}
                        onChange={(e) => setItemField(item.id, "title", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition focus:border-slate-400"
                      />
                    </label>

                    <label className="space-y-1 text-sm text-slate-700">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Category</span>
                      <select
                        value={item.category}
                        onChange={(e) =>
                          setItemField(
                            item.id,
                            "category",
                            e.target.value as (typeof SCHOOL_GALLERY_CATEGORIES)[number]
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition focus:border-slate-400"
                      >
                        {SCHOOL_GALLERY_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {SCHOOL_GALLERY_CATEGORY_LABELS[category]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm text-slate-700">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Sort Order</span>
                      <input
                        type="number"
                        value={item.sort_order}
                        onChange={(e) => setItemField(item.id, "sort_order", Number(e.target.value) || 0)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition focus:border-slate-400"
                      />
                    </label>

                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.is_featured}
                        onChange={(e) => setItemField(item.id, "is_featured", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Featured
                    </label>

                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.is_visible}
                        onChange={(e) => setItemField(item.id, "is_visible", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Visible on School page
                    </label>

                    <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        disabled={busyRowId === item.id || isPending}
                        onClick={() => onSaveItem(item)}
                        className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {busyRowId === item.id ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        disabled={busyRowId === item.id || isPending}
                        onClick={() => onDeleteItem(item)}
                        className="rounded-full border border-rose-300 bg-white px-5 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
