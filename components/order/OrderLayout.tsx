"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { OrderTheme } from "./themes"

interface OrderLayoutProps {
    theme: OrderTheme
    title: string
    subtitle: string
    step?: number
    totalSteps?: number
    children: React.ReactNode
}

/**
 * OrderLayout Component
 * 
 * Wrapper component for order forms (Cake & Pizza).
 * Provides consistent styling, navigation header, and a progress bar.
 * 
 * Props:
 * - theme: Styling theme (colors, fonts) specific to the product type.
 * - title/subtitle: Page headings.
 * - step/totalSteps: For the progress bar.
 */
export function OrderLayout({
    theme,
    title,
    subtitle,
    step = 1,
    totalSteps = 3,
    children
}: OrderLayoutProps) {
    return (
        <div className={cn("min-h-screen pb-20 md:pb-0", theme.colors.background)}>
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-white/60">
                <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-5">
                    <Link
                        href="/"
                        className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col items-center px-3 text-center">
                        <span className={cn("max-w-full truncate text-base font-semibold tracking-wide sm:text-lg", theme.fonts.heading, theme.colors.accent)}>
                            {title}
                        </span>
                    </div>

                    <div className="w-9" /> {/* Spacer for centering */}
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-black/5">
                    <motion.div
                        className={cn("h-full transition-colors", theme.colors.primary)}
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                </div>
            </div>

            <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="mb-8 space-y-2 text-center">
                        <h1 className={cn("text-balance text-3xl font-semibold md:text-4xl", theme.fonts.heading)}>
                            {title}
                        </h1>
                        <p className="mx-auto max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">{subtitle}</p>
                    </div>

                    <div className={cn(
                        "lux-card p-4 sm:p-6 md:p-8 transition-transform",
                        theme.colors.border,
                        theme.animation.hover
                    )}>
                        {children}
                    </div>
                </motion.div>
            </main>
        </div>
    )
}
