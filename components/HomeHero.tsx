"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowUpRight, MapPin, Sparkles, Timer } from "lucide-react"
import { Fraunces, Space_Grotesk } from "next/font/google"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const display = Fraunces({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" })
const body = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" })

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

const featureItems = [
  {
    title: "Same-Day Pickup",
    description: "Fresh bakes ready in 45–90 minutes.",
    icon: Timer,
  },
  {
    title: "Nairobi Scheduled",
    description: "Plan ahead with timed delivery windows.",
    icon: MapPin,
  },
  {
    title: "M-Pesa Friendly",
    description: "Pay on pickup or securely via M-Pesa.",
    icon: Sparkles,
  },
]

export default function HomeHero() {
  const router = useRouter()

  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-[#f6efe7] text-slate-950", body.className)}>
      <div className="absolute inset-0">
        <div className="absolute -left-24 top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-[#f7b6b2] blur-[140px] opacity-60" />
        <div className="absolute right-[-10rem] top-[12rem] h-[30rem] w-[30rem] rounded-full bg-[#ffdd99] blur-[160px] opacity-60" />
        <div className="absolute bottom-[-14rem] left-[20%] h-[28rem] w-[28rem] rounded-full bg-[#c9e4ff] blur-[180px] opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.9),transparent_50%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.7),transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-16 lg:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">
              Thika • Nairobi • Delivery
            </div>

            <h1 className={cn("text-4xl font-semibold leading-tight text-slate-950 md:text-6xl", display.className)}>
              Japhes Cakes & Pizza, crafted for the days you want to remember.
            </h1>

            <p className="max-w-xl text-lg text-slate-700">
              Celebrate with indulgent cakes or settle in with stone-fired pizzas. Every order is
              baked, finished, and delivered by a real kitchen that cares.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/order/cake")}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-900"
              >
                Order Cakes <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push("/order/pizza")}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400"
              >
                Order Pizza <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push("/status")}
                className="inline-flex items-center gap-2 rounded-full border border-transparent px-4 py-3 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                Track Order
              </button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-xl shadow-slate-900/10">
              <div className="absolute inset-0">
                <Image
                  src="/images/premium-cake.jpg"
                  alt="Signature cake in warm light"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              </div>
              <div className="relative flex h-56 flex-col justify-end p-6 text-white">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Signature Cakes</p>
                <p className={cn("text-2xl font-semibold", display.className)}>Velvet & Citrus</p>
                <p className="text-sm text-white/80">Hand-finished, ready for celebrations.</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-xl shadow-slate-900/10">
              <div className="absolute inset-0">
                <Image
                  src="/images/premium-pizza.jpg"
                  alt="Stone-fired pizza with melty cheese"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              </div>
              <div className="relative flex h-56 flex-col justify-end p-6 text-white">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Stone-Fired</p>
                <p className={cn("text-2xl font-semibold", display.className)}>Fire & Cheese</p>
                <p className="text-sm text-white/80">Hot, bold flavors with crispy edges.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {featureItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg shadow-slate-900/5"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className={cn("text-lg font-semibold text-slate-900", display.className)}>{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col gap-6 rounded-[32px] border border-black/10 bg-slate-950 px-8 py-10 text-white shadow-2xl shadow-slate-900/30 md:flex-row md:items-center md:justify-between"
        >
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Orders Open Daily</p>
            <h2 className={cn("text-2xl font-semibold md:text-3xl", display.className)}>
              Ready for an order you’ll actually remember?
            </h2>
            <p className="text-sm text-white/70">
              Custom cakes for celebrations, pizzas for the people you love. Tap once and we’ll take it from there.
            </p>
          </div>
          <button
            onClick={() => router.push("/order/cake")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
          >
            Start an Order <ArrowUpRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </div>
  )
}
