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
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link
                        href="/"
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="flex flex-col items-center">
                        <span className={cn("text-lg font-bold", theme.fonts.heading, theme.colors.accent)}>
                            {title}
                        </span>
                    </div>

                    <div className="w-9" /> {/* Spacer for centering */}
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-gray-100">
                    <motion.div
                        className={cn("h-full transition-colors", theme.colors.primary)}
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="mb-8 text-center space-y-2">
                        <h1 className={cn("text-3xl md:text-4xl font-bold", theme.fonts.heading)}>
                            {title}
                        </h1>
                        <p className="text-muted-foreground">{subtitle}</p>
                    </div>

                    <div className={cn(
                        "bg-white rounded-2xl shadow-sm border p-6 md:p-8",
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
