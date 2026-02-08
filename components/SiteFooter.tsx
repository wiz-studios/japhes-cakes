"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Instagram, Facebook, Phone, MapPin, Clock, Mail } from "lucide-react"

export default function SiteFooter() {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Facebook, href: "#", label: "Facebook" },
  ]

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="container mx-auto px-6 py-20 relative z-10"
      >
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_2fr] mb-16">
          <div className="space-y-6">
            <h2 className="font-serif text-3xl text-white font-bold tracking-tight">Japhe's Cakes & Pizza</h2>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Crafted for celebrations and everyday cravings. Baked fresh, finished with care, delivered with pride.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all duration-300"
                  aria-label={social.label}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            <div className="space-y-4">
              <h3 className="text-white font-semibold uppercase text-xs tracking-[0.25em]">Order</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/order/cake" className="hover:text-white transition-colors">Cakes</Link></li>
                <li><Link href="/order/pizza" className="hover:text-white transition-colors">Pizza</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Track Order</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-white font-semibold uppercase text-xs tracking-[0.25em]">Visit</h3>
              <ul className="space-y-3 text-sm">
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
              <h3 className="text-white font-semibold uppercase text-xs tracking-[0.25em]">Contact</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>+254 700 000 000</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>hello@japhes.co.ke</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-white font-semibold uppercase text-xs tracking-[0.25em]">Company</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/admin/login" className="hover:text-white transition-colors">Admin Login</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>(c) {currentYear} Japhe's Cakes & Pizza. All rights reserved.</p>
          <p>Designed for Thika and Nairobi orders.</p>
        </div>
      </motion.div>
    </footer>
  )
}
