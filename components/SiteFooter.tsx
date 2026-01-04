"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Instagram, Facebook, Phone, MapPin, Clock } from "lucide-react"

export default function SiteFooter() {
    const currentYear = new Date().getFullYear()

    // Social Links (Placeholders)
    const socialLinks = [
        { icon: Instagram, href: "#", label: "Instagram" },
        { icon: Facebook, href: "#", label: "Facebook" },
    ]

    return (
        <footer className="bg-neutral-950 text-neutral-400 border-t border-white/5 relative overflow-hidden">
            {/* Subtle background texture/gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black opacity-50 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="container mx-auto px-6 py-20 relative z-10"
            >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">

                    {/* Brand Column */}
                    <div className="md:col-span-4 space-y-6">
                        <h2 className="font-serif text-3xl text-white font-bold tracking-tight">Japhe’s Cakes & Pizza</h2>
                        <p className="text-lg font-serif italic text-neutral-500 max-w-xs leading-relaxed">
                            "Crafted with love. <br />Baked with passion."
                        </p>
                    </div>

                    {/* Navigation Columns */}
                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-10">

                        {/* Explore */}
                        <div className="space-y-6">
                            <h3 className="text-white font-medium tracking-wide uppercase text-xs">Explore</h3>
                            <ul className="space-y-4">
                                <li><Link href="/order/cake" className="hover:text-amber-400 transition-colors">Cakes</Link></li>
                                <li><Link href="/order/pizza" className="hover:text-rose-400 transition-colors">Pizzas</Link></li>
                                <li><Link href="/status" className="hover:text-white transition-colors">Order Status</Link></li>
                            </ul>
                        </div>

                        {/* Visit */}
                        <div className="space-y-6">
                            <h3 className="text-white font-medium tracking-wide uppercase text-xs">Visit</h3>
                            <ul className="space-y-4 text-sm">
                                <li className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-neutral-600 shrink-0" />
                                    <span>Thika, Kenya<br />Nairobi Delivery Available</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-neutral-600 shrink-0" />
                                    <span>+254 700 000 000</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Clock className="w-5 h-5 text-neutral-600 shrink-0" />
                                    <span>Mon - Sun<br />8:00 AM - 9:00 PM</span>
                                </li>
                            </ul>
                        </div>

                        {/* Social */}
                        <div className="space-y-6">
                            <h3 className="text-white font-medium tracking-wide uppercase text-xs">Connect</h3>
                            <div className="flex gap-4">
                                {socialLinks.map((social) => (
                                    <a
                                        key={social.label}
                                        href={social.href}
                                        className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300"
                                        aria-label={social.label}
                                    >
                                        <social.icon size={18} />
                                    </a>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs tracking-wide text-neutral-600">
                    <p>© {currentYear} Japhe’s Cakes & Pizza. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="hover:text-neutral-400">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-neutral-400">Terms of Service</Link>
                    </div>
                </div>

            </motion.div>
        </footer>
    )
}
