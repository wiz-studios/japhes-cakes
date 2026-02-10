"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  variant?: "light" | "dark"
  showTagline?: boolean
  className?: string
  href?: string
}

export default function BrandLogo({
  variant = "light",
  showTagline = true,
  className,
  href = "/",
}: BrandLogoProps) {
  const isDark = variant === "dark"
  const mainTone = isDark ? "text-white" : "text-[var(--lux-ink)]"
  const accentTone = isDark ? "text-white/80" : "text-slate-600"
  const taglineTone = isDark ? "text-white/60" : "text-slate-500"
  const lineTone = isDark ? "bg-white/40" : "bg-slate-300"

  return (
    <Link href={href} className={cn("group inline-flex flex-col leading-none", className)} aria-label="Japhe's Cakes & Pizza">
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
    </Link>
  )
}
