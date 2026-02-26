"use client"

import Link from "next/link"
import { useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Headset, Mail, MessageCircle, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

const SUPPORT_PHONE = "+254708244764"
const SUPPORT_EMAIL = "ericklangat716@gmail.com"
const SUPPORT_WHATSAPP = "254708244764"

export default function SupportDrawer() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isStaffArea =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/kitchen") ||
    pathname?.startsWith("/delivery") ||
    pathname?.startsWith("/staff")

  const orderId = searchParams.get("id")?.trim() || ""
  const whatsappLink = useMemo(() => {
    const body = orderId
      ? `Hello Japhe's Cakes & Pizza, I need help with order ${orderId}.`
      : "Hello Japhe's Cakes & Pizza, I need help with my order."
    return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(body)}`
  }, [orderId])

  if (isStaffArea) return null

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          type="button"
          className="fixed bottom-5 left-5 z-[60] h-12 rounded-full bg-slate-900 px-4 text-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)] hover:bg-slate-800 print:hidden"
          aria-label="Open support options"
        >
          <Headset className="mr-2 h-4 w-4" />
          Need Help?
        </Button>
      </DrawerTrigger>
      <DrawerContent className="border-t border-slate-200 bg-white">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg text-slate-900">Support Desk</DrawerTitle>
          <DrawerDescription className="text-sm text-slate-600">
            Reach operations instantly for order updates, payment help, or delivery changes.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-2 px-4 pb-2">
          <Link
            href={`tel:${SUPPORT_PHONE}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 hover:bg-slate-100"
          >
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Support
            </span>
            <span className="font-semibold">{SUPPORT_PHONE.replace("+254", "0")}</span>
          </Link>

          <Link
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 hover:bg-slate-100"
          >
            <span className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </span>
            <span className="font-semibold">Chat now</span>
          </Link>

          <Link
            href={`mailto:${SUPPORT_EMAIL}${orderId ? `?subject=Order%20${encodeURIComponent(orderId)}%20Support` : ""}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 hover:bg-slate-100"
          >
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </span>
            <span className="max-w-[55%] truncate font-semibold">{SUPPORT_EMAIL}</span>
          </Link>
        </div>

        {orderId && (
          <p className="px-4 text-xs text-slate-500">
            Current order reference: <span className="font-semibold text-slate-700">{orderId}</span>
          </p>
        )}

        <DrawerFooter>
          <DrawerClose asChild>
            <Button type="button" variant="outline" className="rounded-full border-slate-300">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
