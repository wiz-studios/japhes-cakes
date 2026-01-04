"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion"
import { Menu, X, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"

export default function SiteHeader() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const { scrollY } = useScroll()
    const pathname = usePathname()
    const isOrderPage = pathname?.startsWith("/order")

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0
        if (latest > 50 && latest > previous) {
            setIsScrolled(true)
        } else if (latest < 50) {
            setIsScrolled(false)
        }
    })

    // Prevent scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
    }, [isMobileMenuOpen])

    if (isOrderPage) return null

    const navLinks = [
        { name: "Cakes", href: "/order/cake" },
        { name: "Pizzas", href: "/order/pizza" },
        { name: "Order Status", href: "/status" },
    ]

    return (
        <>
            <motion.header
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out border-b border-transparent",
                    isScrolled
                        ? "bg-black/80 backdrop-blur-md border-white/10 py-3"
                        : "bg-transparent py-6"
                )}
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="container mx-auto px-6 h-full flex items-center justify-between">
                    {/* Brand Logo */}
                    <Link href="/" className="relative z-50">
                        <span className={cn(
                            "font-serif text-2xl font-bold tracking-tight transition-colors duration-300",
                            isMobileMenuOpen ? "text-white" : "text-white"
                        )}>
                            Japhe’s Cakes & Pizza
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-white/80 hover:text-white text-sm font-medium transition-colors relative group"
                            >
                                {link.name}
                                <span className="absolute left-0 bottom-[-4px] w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full opacity-50" />
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop CTA */}
                    <div className="hidden md:block">
                        <Link href="/order/cake">
                            <motion.button
                                whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(255,255,255,0.2)" }}
                                whileTap={{ scale: 0.98 }}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-6 py-2 rounded-full text-sm font-medium transition-all"
                            >
                                Order Now
                            </motion.button>
                        </Link>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden relative z-50 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </motion.header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl md:hidden flex flex-col items-center justify-center"
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
                                        className="font-serif text-3xl text-white/90 hover:text-white transition-colors"
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
                                    <button className="bg-white text-black px-8 py-3 rounded-full text-lg font-bold hover:bg-gray-200 transition-colors">
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
