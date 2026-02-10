"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  variant?: "light" | "dark"
  className?: string
  href?: string
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
}

export default function BrandLogo({
  variant = "light",
  className,
  href = "/",
  size = "md",
  showTagline = true,
}: BrandLogoProps) {
  const isDark = variant === "dark"
  const mainTone = isDark ? "text-white" : "text-[var(--lux-ink)]"
  const accentTone = isDark ? "text-white/80" : "text-slate-600"
  const taglineTone = isDark ? "text-white/60" : "text-slate-500"
  const lineTone = isDark ? "bg-white/40" : "bg-slate-300"

  const sizes = {
    sm: {
      title: "text-xl md:text-2xl",
      sub: "text-[9px] md:text-[10px]",
      tag: "text-[9px]",
      line: "w-5",
      gap: "gap-2",
    },
    md: {
      title: "text-2xl md:text-3xl",
      sub: "text-[10px] md:text-[11px]",
      tag: "text-[10px]",
      line: "w-6",
      gap: "gap-2",
    },
    lg: {
      title: "text-3xl md:text-4xl",
      sub: "text-[11px] md:text-[12px]",
      tag: "text-[11px]",
      line: "w-7",
      gap: "gap-2",
    },
  }[size]

  return (
    <Link
      href={href}
      className={cn("group inline-flex flex-col leading-none", className)}
      aria-label="Japhe's Cakes & Pizza"
    >
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={cn("font-serif font-semibold tracking-tight", sizes.title, mainTone)}>
          Japhe's
        </span>
        <span className={cn("uppercase tracking-[0.36em] font-semibold", sizes.sub, accentTone)}>
          Cakes & Pizza
        </span>
      </span>
      {showTagline && (
        <span className={cn("mt-1 inline-flex items-center uppercase tracking-[0.32em] font-semibold", sizes.tag, taglineTone, sizes.gap)}>
          <span className={cn("h-px", sizes.line, lineTone)} aria-hidden="true" />
          Quality is our Priority
        </span>
      )}
    </Link>
  )
}
