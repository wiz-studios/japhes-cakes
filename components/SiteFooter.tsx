"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Instagram, Facebook, Phone, MapPin, Clock, Mail } from "lucide-react"
import { usePathname } from "next/navigation"
import BrandLogo from "@/components/BrandLogo"

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.9 7.5a6.7 6.7 0 0 1-3.9-1.3v7.2a6 6 0 1 1-5.3-6v3.3a2.7 2.7 0 1 0 2 2.6V2h3.2c.2 1.1.7 2.1 1.5 2.9.8.8 1.8 1.3 2.9 1.5v1.1Z"
      />
    </svg>
  )
}

export default function SiteFooter() {
  const currentYear = new Date().getFullYear()
  const pathname = usePathname()
  const isStaffArea =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/kitchen") ||
    pathname?.startsWith("/delivery") ||
    pathname?.startsWith("/staff")

  if (isStaffArea) return null

  const socialLinks = [
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: TikTokIcon, href: "#", label: "TikTok" },
  ]

  return (
    <footer className="bg-[#0b0c12] text-slate-300 border-t border-white/5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(80,98,210,0.35),transparent_65%)] blur-3xl opacity-70" />
      <div className="absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(216,47,125,0.32),transparent_65%)] blur-3xl opacity-70" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_45%),radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 1, y: 0 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="container mx-auto px-6 py-20 relative z-10"
      >
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-10 md:p-14 shadow-[0_40px_140px_-100px_rgba(6,7,14,0.9)] backdrop-blur-2xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_2fr]">
            <div className="space-y-6">
              <BrandLogo variant="dark" size="lg" showTagline={false} />
              <p className="text-sm text-slate-300/80 max-w-sm leading-relaxed">
                Crafted for celebrations and everyday cravings. Baked fresh, finished with care, delivered with pride.
              </p>
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 shadow-[0_12px_30px_-18px_rgba(255,255,255,0.7)] hover:bg-white/15 hover:text-white transition-all duration-300"
                    aria-label={social.label}
                  >
                    <social.icon className="w-[18px] h-[18px]" />
                  </a>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-4">
                <h3 className="text-white font-semibold uppercase text-xs tracking-[0.32em]">Order</h3>
                <ul className="space-y-3 text-sm text-slate-300/85">
                  <li><Link href="/order/cake" className="hover:text-white transition-colors">Cakes</Link></li>
                  <li><Link href="/order/pizza" className="hover:text-white transition-colors">Pizza</Link></li>
                  <li><Link href="/school" className="hover:text-white transition-colors">School of Cakes</Link></li>
                  <li><Link href="/status" className="hover:text-white transition-colors">Track Order</Link></li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-semibold uppercase text-xs tracking-[0.32em]">Visit</h3>
                <ul className="space-y-3 text-sm text-slate-300/85">
                  <li className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Thika, Kenya<br />Nairobi delivery available</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Mon - Sun<br />8:00 AM - 9:00 PM</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-semibold uppercase text-xs tracking-[0.32em]">Contact</h3>
                <ul className="space-y-3 text-sm text-slate-300/85">
                  <li className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>0708244764</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="break-all">ericklangat716@gmail.com</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-semibold uppercase text-xs tracking-[0.32em]">Company</h3>
                <ul className="space-y-3 text-sm text-slate-300/85">
                  <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                  <li><Link href="/admin/login" className="hover:text-white transition-colors">Admin Login</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>(c) {currentYear} Japhe's Cakes & Pizza. All rights reserved.</p>
          <p>Designed for Thika and Nairobi orders.</p>
        </div>
      </motion.div>
    </footer>
  )
}
