"use client"

import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  variant?: "light" | "dark"
  className?: string
  href?: string
  size?: "sm" | "md" | "lg"
}

export default function BrandLogo({
  variant = "light",
  className,
  href = "/",
  size = "md",
}: BrandLogoProps) {
  const isDark = variant === "dark"
  const logoSrc = isDark ? "/brand/wordmark-light.png" : "/brand/wordmark.png"
  const sizeClass = size === "sm" ? "h-8" : size === "lg" ? "h-12" : "h-10"

  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center leading-none", className)}
      aria-label="Japhe's Cakes & Pizza"
    >
      <Image
        src={logoSrc}
        alt="Japhe's Cakes & Pizza"
        width={520}
        height={140}
        className={cn(sizeClass, "w-auto")}
        priority
      />
    </Link>
  )
}
