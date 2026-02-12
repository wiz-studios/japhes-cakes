"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import {
  SCHOOL_GALLERY_CATEGORIES,
  SCHOOL_GALLERY_CATEGORY_LABELS,
  type SchoolGalleryCategory,
  type SchoolGalleryItem,
} from "@/lib/school-gallery"

type Props = {
  items: SchoolGalleryItem[]
}

export default function SchoolGallerySection({ items }: Props) {
  const [activeCategory, setActiveCategory] = useState<SchoolGalleryCategory | "all">("all")
  const [selected, setSelected] = useState<SchoolGalleryItem | null>(null)

  const featured = useMemo(
    () => items.filter((item) => item.is_featured).slice(0, 4),
    [items]
  )

  const filtered = useMemo(() => {
    if (activeCategory === "all") return items
    return items.filter((item) => item.category === activeCategory)
  }, [activeCategory, items])

  return (
    <section className="mx-auto max-w-6xl px-6 pb-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Student Portfolio</p>
          <h2 className="text-3xl font-serif font-semibold text-slate-900">Student moments and real class work</h2>
          <p className="mt-2 text-sm text-slate-600">
            Browse classes in progress and finished cakes or pizzas from our training sessions.
          </p>
        </div>
      </div>

      {featured.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {featured.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelected(item)}
              className="group relative overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-[0_24px_60px_-45px_rgba(15,20,40,0.45)]"
            >
              <div className="relative h-56 w-full">
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-4 pb-4 pt-8 text-left">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/80">
                  {SCHOOL_GALLERY_CATEGORY_LABELS[item.category]}
                </p>
                <p className="mt-1 text-base font-semibold text-white">{item.title}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
            activeCategory === "all"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          All
        </button>
        {SCHOOL_GALLERY_CATEGORIES.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              activeCategory === category
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {SCHOOL_GALLERY_CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-600">
          No photos in this category yet. New class and student work photos will appear here.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelected(item)}
              className="group overflow-hidden rounded-[22px] border border-white/60 bg-white text-left shadow-[0_20px_55px_-45px_rgba(15,20,40,0.5)]"
            >
              <div className="relative h-52 w-full">
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  {SCHOOL_GALLERY_CATEGORY_LABELS[item.category]}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] bg-black/75 px-4 py-6">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-2xl bg-slate-950/70 p-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">
                  {SCHOOL_GALLERY_CATEGORY_LABELS[selected.category]}
                </p>
                <p className="text-sm font-semibold text-white">{selected.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border border-white/20 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10">
              <Image
                src={selected.image_url}
                alt={selected.title}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
