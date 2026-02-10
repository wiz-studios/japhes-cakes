"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import BrandLogo from "@/components/BrandLogo"

export default function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { scrollY } = useScroll()
  const pathname = usePathname()
  const isOrderPage = pathname?.startsWith("/order")
  const isStaffArea =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/kitchen") ||
    pathname?.startsWith("/delivery") ||
    pathname?.startsWith("/staff")

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0
    if (latest > 50 && latest > previous) {
      setIsScrolled(true)
    } else if (latest < 50) {
      setIsScrolled(false)
    }
  })

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset"
  }, [isMobileMenuOpen])

  if (isOrderPage || isStaffArea) return null

  const navLinks = [
    { name: "Cakes", href: "/order/cake" },
    { name: "Pizza", href: "/order/pizza" },
    { name: "Track Order", href: "/status" },
  ]

  return (
    <>
      <motion.header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out border-b",
          isScrolled
            ? "bg-white/85 backdrop-blur-xl border-white/60 shadow-[0_20px_60px_-45px_rgba(15,20,40,0.6)] py-3"
            : "bg-white/55 backdrop-blur-xl border-white/40 py-5"
        )}
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <BrandLogo />

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-[11px] uppercase tracking-[0.28em] text-slate-600 hover:text-slate-900 font-semibold transition-colors relative group"
              >
                {link.name}
                <span className="absolute left-0 bottom-[-6px] w-0 h-[2px] bg-[var(--lux-ink)] transition-all duration-300 group-hover:w-full opacity-80" />
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">
            <Link href="/order/cake">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 16px 30px rgba(15,23,42,0.18)" }}
                whileTap={{ scale: 0.98 }}
                className="bg-[#0f1116] hover:bg-[#191c24] text-white border border-white/10 px-6 py-2 rounded-full text-sm font-semibold transition-all"
              >
                Order Now
              </motion.button>
            </Link>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden relative z-50 text-slate-900 p-2 hover:bg-slate-900/10 rounded-full transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-white/90 backdrop-blur-xl md:hidden flex flex-col items-center justify-center"
          >
            <nav className="flex flex-col items-center gap-8">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.name}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="font-serif text-3xl text-slate-900 hover:text-slate-700 transition-colors"
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-8"
              >
                <Link href="/order/cake" onClick={() => setIsMobileMenuOpen(false)}>
                  <button className="bg-[#0f1116] text-white px-8 py-3 rounded-full text-lg font-bold hover:bg-[#191c24] transition-colors">
                    Order Now
                  </button>
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
