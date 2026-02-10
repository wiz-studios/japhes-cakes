"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M20.5 3.5A11 11 0 0 0 3.7 18.4L3 22l3.7-.7A11 11 0 1 0 20.5 3.5Zm-8.3 17a8.9 8.9 0 0 1-4.5-1.2l-.3-.2-2.6.5.5-2.5-.2-.3A8.9 8.9 0 1 1 12.2 20.5Zm4.9-6.7c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.1-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2.1-.4 0-.5-.1-.1-.7-1.7-.9-2.3-.2-.6-.4-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.4s1 2.7 1.1 2.9c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3 0-.2-.2-.3-.5-.4Z"
      />
    </svg>
  )
}

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
      className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)] transition hover:-translate-y-1"
      aria-label={`WhatsApp ${phone}`}
      target="_blank"
      rel="noreferrer"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </Link>
  )
}
