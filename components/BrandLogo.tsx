"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  variant?: "light" | "dark"
  showTagline?: boolean
  showMark?: boolean
  className?: string
  href?: string
}

export default function BrandLogo({
  variant = "light",
  showTagline = true,
  showMark = true,
  className,
  href = "/",
}: BrandLogoProps) {
  const isDark = variant === "dark"
  const mainTone = isDark ? "text-white" : "text-[var(--lux-ink)]"
  const accentTone = isDark ? "text-white/80" : "text-slate-600"
  const taglineTone = isDark ? "text-white/60" : "text-slate-500"
  const lineTone = isDark ? "bg-white/40" : "bg-slate-300"
  const markRing = isDark ? "border-white/30 bg-white/10 text-white" : "border-slate-300/70 bg-white text-[var(--lux-ink)]"

  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-3 leading-none", className)}
      aria-label="Japhe's Cakes & Pizza"
    >
      {showMark && (
        <span className={cn("flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full border", markRing)}>
          <svg
            viewBox="0 0 48 48"
            className="h-5 w-5 md:h-6 md:w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 10h12" />
            <path d="M28 10v18a10 10 0 0 1-10 10h-6" />
            <path d="M28 14l14-6" />
            <path d="M28 18h15" />
            <path d="M28 22l14 6" />
          </svg>
        </span>
      )}
      <span className="flex flex-col">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cn("font-serif text-2xl md:text-3xl font-semibold tracking-tight", mainTone)}>
            Japhe's
          </span>
          <span className={cn("text-[10px] md:text-[11px] uppercase tracking-[0.36em] font-semibold", accentTone)}>
            Cakes & Pizza
          </span>
        </span>
        {showTagline && (
          <span className={cn("mt-1 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] font-semibold", taglineTone)}>
            <span className={cn("h-px w-6", lineTone)} aria-hidden="true" />
            Quality is our Priority
          </span>
        )}
      </span>
    </Link>
  )
}
