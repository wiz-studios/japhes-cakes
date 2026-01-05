"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Utility for cleaner class merging
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

export default function HomeHero() {
  const [hoveredSide, setHoveredSide] = useState<"cake" | "pizza" | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check initial size and listen for resize
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()

    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  const handleHover = (side: "cake" | "pizza" | null) => {
    if (isDesktop) setHoveredSide(side)
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col lg:flex-row">
      {/* 
        LEFT SIDE: CAKES 
        - Desktop: Expands to 70% on hover
        - Mobile: Takes top 50% height (or auto stack)
      */}
      <motion.div
        className="relative flex-1 h-1/2 lg:h-full lg:flex-none overflow-hidden cursor-pointer group"
        initial={{ width: "100%", opacity: 0, x: -50 }}
        animate={{
          width: isDesktop
            ? (hoveredSide === "cake" ? "70%" : hoveredSide === "pizza" ? "30%" : "50%")
            : "100%",
          opacity: 1,
          x: 0,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        onMouseEnter={() => handleHover("cake")}
        onMouseLeave={() => handleHover(null)}
        onClick={() => router.push("/order/cake")}
        role="button"
        aria-label="Order Cakes"
        tabIndex={0}
      >
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/premium-cake.jpg"
            alt="Decadent multi-tier wedding cake with warm golden lighting"
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            priority
            quality={90}
          />
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent lg:bg-gradient-to-r lg:from-black/60 lg:via-transparent lg:to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-end lg:justify-center h-full p-8 lg:p-16">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-serif text-4xl lg:text-7xl font-bold text-amber-50 drop-shadow-lg leading-tight mb-2">
              The Bakery
            </h2>
            <p className="text-amber-100/90 text-lg lg:text-xl font-medium max-w-md font-serif italic">
              Indulge in handcrafted elegance. Crafted for your sweetest moments.
            </p>
            <motion.div
              className="mt-6 inline-flex items-center gap-2 text-amber-200 uppercase tracking-widest text-sm font-bold border-b border-amber-200/50 pb-1"
              animate={{ x: hoveredSide === "cake" ? 10 : 0, opacity: hoveredSide === "cake" ? 1 : 0.8 }}
            >
              Order Cakes <span aria-hidden="true">&rarr;</span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* CENTER DIVIDER (Desktop Only) */}
      <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <motion.div
          animate={{
            scale: hoveredSide ? 0.8 : 1,
            opacity: hoveredSide ? 0.5 : 1,
          }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full w-16 h-16 flex items-center justify-center shadow-xl"
        >
          <span className="font-serif italic text-white font-bold text-lg">VS</span>
        </motion.div>
      </div>

      {/* 
        RIGHT SIDE: PIZZA 
        - Desktop: Expands to 70% on hover
        - Mobile: Takes bottom 50% height
      */}
      <motion.div
        className="relative flex-1 h-1/2 lg:h-full lg:flex-none overflow-hidden cursor-pointer group"
        initial={{ width: "100%", opacity: 0, x: 50 }}
        animate={{
          width: isDesktop
            ? (hoveredSide === "pizza" ? "70%" : hoveredSide === "cake" ? "30%" : "50%")
            : "100%",
          opacity: 1,
          x: 0,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        onMouseEnter={() => handleHover("pizza")}
        onMouseLeave={() => handleHover(null)}
        onClick={() => router.push("/order/pizza")}
        role="button"
        aria-label="Order Pizza"
        tabIndex={0}
      >
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/premium-pizza.jpg"
            alt="Artisan pizza with melting cheese and steam rising"
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            priority
            quality={90}
          />
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent lg:bg-gradient-to-l lg:from-black/60 lg:via-transparent lg:to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-end lg:justify-center h-full p-8 lg:p-16 lg:items-end lg:text-right">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="font-sans text-4xl lg:text-7xl font-extrabold text-white drop-shadow-lg leading-tight mb-2 tracking-tight">
              The Pizzeria
            </h2>
            <p className="text-gray-200 text-lg lg:text-xl font-medium max-w-md ml-auto">
              Fire-baked perfection. Hot, spicy, and irresistibly cheesy.
            </p>
            <motion.div
              className="mt-6 inline-flex items-center gap-2 text-rose-400 uppercase tracking-widest text-sm font-bold border-b border-rose-400/50 pb-1"
              animate={{ x: hoveredSide === "pizza" ? -10 : 0, opacity: hoveredSide === "pizza" ? 1 : 0.8 }}
            >
              <span aria-hidden="true">&larr;</span> Order Pizza
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
