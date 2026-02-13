"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

export default function FloatingWhatsApp() {
  const pathname = usePathname()
  const isCake = pathname?.startsWith("/order/cake")
  const isPizza = pathname?.startsWith("/order/pizza")
  const isSchool = pathname?.startsWith("/school")

  let phone = ""
  if (isPizza) phone = "+254112345632"
  if (isCake || isSchool) phone = "+254708244764"

  if (!phone) return null

  const clean = phone.replace(/[^\d]/g, "")

  return (
    <Link
      href={`https://wa.me/${clean}`}
      className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-transparent shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)] transition hover:-translate-y-1"
      aria-label={`WhatsApp ${phone}`}
      target="_blank"
      rel="noreferrer"
    >
      <img src="/whatsapp-color-svgrepo-com.svg" alt="WhatsApp" className="h-12 w-12" />
    </Link>
  )
}
