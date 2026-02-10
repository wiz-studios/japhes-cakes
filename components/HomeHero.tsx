"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowUpRight, MapPin, Sparkles, Timer } from "lucide-react"

const featureItems = [
  {
    title: "Same-Day Pickup",
    description: "Fresh bakes ready in 45-90 minutes.",
    icon: Timer,
  },
  {
    title: "Nairobi Scheduled",
    description: "Plan ahead with timed delivery windows.",
    icon: MapPin,
  },
  {
    title: "M-Pesa Friendly",
    description: "Pay 50% deposit via M-Pesa and clear the balance on pickup or delivery.",
    icon: Sparkles,
  },
]

export default function HomeHero() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--brand-cream)] text-slate-950 font-sans">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#2f4dc8_0%,#3448c0_28%,#5d55c3_46%,#9a57b1_60%,#cd4d97_74%,#f6b8d7_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.35),transparent_42%),radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.2),transparent_48%),radial-gradient(circle_at_55%_85%,rgba(0,0,0,0.2),transparent_60%)]" />
        <div className="absolute -left-44 top-[-12rem] h-[36rem] w-[36rem] rounded-full bg-[#4d66e8]/35 blur-[190px]" />
        <div className="absolute right-[-14rem] top-[-12rem] h-[38rem] w-[38rem] rounded-full bg-[#f3a6cc]/40 blur-[200px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(0,0,0,0.22)_100%)]" />
        <div className="absolute right-10 top-24 h-24 w-24 opacity-45 bg-[radial-gradient(circle,rgba(255,255,255,0.85)_2px,transparent_2px)] [background-size:14px_14px]" />
        <div className="absolute inset-0 hero-grain" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-[calc(6.5rem+env(safe-area-inset-top))] md:pt-24 lg:pt-28">
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
        >
          <div className="space-y-6 rounded-[32px] p-8 pt-10 text-white lux-glass md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/85">
              Thika - Nairobi - Delivery
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/80">
              <Sparkles className="h-4 w-4" />
              2-for-1 Tue & Thu (Medium/Large)
            </div>

            <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl font-serif">
              Japhes Cakes & Pizza, crafted for the days you want to remember.
            </h1>

            <p className="max-w-xl text-lg text-white/80">
              Celebrate with indulgent cakes or settle in with stone-fired pizzas. Every order is
              baked, finished, and delivered by a real kitchen that cares.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/order/cake")}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--brand-magenta-deep)] shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:bg-white/90"
              >
                Order Cakes <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push("/order/pizza")}
                className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                Order Pizza <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push("/status")}
                className="inline-flex items-center gap-2 rounded-full border border-transparent px-4 py-3 text-sm font-semibold text-white/75 transition hover:text-white"
              >
                Track Order
              </button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="grid gap-6"
          >
            <div className="relative overflow-hidden rounded-[34px] border border-white/60 bg-white/15 p-[2px] shadow-[0_32px_80px_-40px_rgba(15,23,42,0.6)] backdrop-blur-sm">
              <div className="relative overflow-hidden rounded-[30px]">
                <div className="absolute left-8 top-0 h-[2px] w-24 bg-[linear-gradient(90deg,var(--brand-sun),transparent)]" />
                <div className="absolute inset-0">
                  <Image
                    src="/images/premium-cake.jpg"
                    alt="Signature cake in warm light"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
                </div>
                <div className="relative flex min-h-[16rem] flex-col justify-between gap-6 p-7 text-white md:min-h-[18rem]">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/70">
                    Signature Cakes
                    <button
                      onClick={() => router.push("/order/cake")}
                      className="rounded-full border border-white/30 px-3 py-1 text-[10px] tracking-[0.3em] text-white/80 transition hover:bg-white/15"
                    >
                      Order Now
                    </button>
                  </div>
                  <div className="space-y-3">
                    <p className="text-3xl font-semibold font-serif">Velvet & Citrus</p>
                    <p className="text-sm text-white/80">
                      Hand-finished layers with custom details, made for celebrations and gifting.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[34px] border border-white/60 bg-white/15 p-[2px] shadow-[0_32px_80px_-40px_rgba(15,23,42,0.6)] backdrop-blur-sm">
              <div className="relative overflow-hidden rounded-[30px]">
                <div className="absolute left-8 top-0 h-[2px] w-24 bg-[linear-gradient(90deg,var(--brand-sun),transparent)]" />
                <div className="absolute inset-0">
                  <Image
                    src="/images/premium-pizza.jpg"
                    alt="Stone-fired pizza with melty cheese"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
                </div>
                <div className="relative flex min-h-[16rem] flex-col justify-between gap-6 p-7 text-white md:min-h-[18rem]">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/70">
                    Stone-Fired Pizza
                    <button
                      onClick={() => router.push("/order/pizza")}
                      className="rounded-full border border-white/30 px-3 py-1 text-[10px] tracking-[0.3em] text-white/80 transition hover:bg-white/15"
                    >
                      Order Hot
                    </button>
                  </div>
                  <div className="space-y-3">
                    <p className="text-3xl font-semibold font-serif">Fire & Cheese</p>
                    <p className="text-sm text-white/80">
                      Crisp edges, molten cheese, and bold toppings baked to order every time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {featureItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="lux-card p-6"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-blue))] text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 font-serif">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="relative overflow-hidden rounded-[32px] border border-white/40 bg-white/70 px-8 py-8 shadow-[0_30px_80px_-55px_rgba(15,20,40,0.45)] backdrop-blur-sm md:flex md:items-center md:justify-between"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(216,47,125,0.15),transparent_55%),radial-gradient(circle_at_right,rgba(58,78,216,0.2),transparent_45%)]" />
          <div className="relative space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">School of Cakes</p>
            <h2 className="text-2xl font-semibold font-serif text-slate-900">
              We Bake & Learn
            </h2>
            <p className="text-sm text-slate-600 max-w-xl">
              Join our hands-on cake school with a 20% offer on every course. Learn baking, decoration, bread products, and more.
            </p>
          </div>
          <button
            onClick={() => router.push("/school")}
            className="relative mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#0f1116] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#191c24] md:mt-0"
          >
            Explore the School <ArrowUpRight className="h-4 w-4" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col gap-6 rounded-[32px] border border-white/30 bg-[linear-gradient(120deg,var(--brand-magenta),var(--brand-blue))] px-8 py-10 text-white shadow-2xl shadow-black/25 md:flex-row md:items-center md:justify-between"
        >
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Orders Open Daily</p>
            <h2 className="text-2xl font-semibold md:text-3xl font-serif">
              Ready for an order you'll actually remember?
            </h2>
            <p className="text-sm text-white/70">
              Custom cakes for celebrations, pizzas for the people you love. Tap once and we'll take it from there.
            </p>
          </div>
          <button
            onClick={() => router.push("/order/cake")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--brand-blue-deep)] transition hover:-translate-y-0.5"
          >
            Start an Order <ArrowUpRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </div>
  )
}
