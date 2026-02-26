import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const CARD_BASE =
  "group rounded-3xl border border-white/60 bg-white/90 p-7 shadow-[0_28px_60px_-50px_rgba(15,20,40,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-45px_rgba(15,20,40,0.5)]"

export default function OrderLandingPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(140deg,#f5f7ff_0%,#f2eef8_55%,#f8eff8_100%)] px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back Home
          </Link>
        </div>

        <div className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-500">Start Your Order</p>
          <h1 className="text-4xl font-semibold text-slate-900 md:text-5xl">Choose What You Want</h1>
          <p className="max-w-2xl text-base text-slate-600">
            Pick your order flow below. You can continue with M-Pesa on the next steps.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Link href="/order/cake" className={CARD_BASE}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7a2f72]">Cake Orders</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Custom Cakes</h2>
            <p className="mt-2 text-sm text-slate-600">
              Flavor, size, message, and design notes.
            </p>
            <span className="mt-6 inline-flex rounded-full bg-[#7a2f72] px-4 py-2 text-sm font-semibold text-white">
              Order Cake
            </span>
          </Link>

          <Link href="/order/pizza" className={CARD_BASE}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1f3c88]">Pizza Orders</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Stone-Fired Pizza</h2>
            <p className="mt-2 text-sm text-slate-600">
              Choose flavor, size, extras, and fulfilment.
            </p>
            <span className="mt-6 inline-flex rounded-full bg-[#1f3c88] px-4 py-2 text-sm font-semibold text-white">
              Order Pizza
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
