import type { Metadata } from "next"
import Link from "next/link"
import { BadgeCheck, CalendarClock, GraduationCap, MapPin, Phone, Sparkles } from "lucide-react"

export const metadata: Metadata = {
  title: "School of Cakes | Japhe's Cakes & Pizza",
  description: "Join Japhe's Cake House School and learn professional cake making, decoration, and bakery skills.",
}

const fees = [
  { label: "Registration", value: "Ksh 500" },
  { label: "Certificate", value: "Ksh 600" },
  { label: "Basic", value: "Ksh 17,000" },
  { label: "Intermediate", value: "Ksh 21,000" },
  { label: "Advanced", value: "Ksh 18,000" },
  { label: "Yoghurt & Milkshake", value: "Ksh 6,000" },
]

const curriculum = [
  {
    title: "Course 1: Basic Cake Making & Decoration",
    duration: "1 month",
    cost: "Ksh 17,000",
    items: [
      "Muffins",
      "Queen Cakes",
      "Vanilla Cakes",
      "Marble Cakes",
      "Carrot Cakes",
      "Swiss Roll",
      "Chocolate Cake",
      "Banana Cake",
      "Coating",
      "Entrepreneurship",
      "Birthday Cakes Decoration",
      "Anniversary Cake Decoration",
      "Special Occasion Cake Decoration",
      "Piping & Writing Decoration",
      "Doughnuts",
    ],
  },
  {
    title: "Course 2: Intermediate Cake Making & Decoration",
    duration: "1 month",
    cost: "Ksh 21,000",
    items: [
      "Black Forest",
      "Red Velvet",
      "White Forest",
      "Mickie Mouse",
      "Basket Weave",
      "Royal Icing",
      "Logo Making",
      "Eclairs",
      "Pizza",
      "Sweetbread & Bread Rolls",
      "Whole Meal Bread",
      "Cookies",
    ],
  },
  {
    title: "Course 3: Advanced Cake Making & Decoration",
    duration: "36 hours",
    cost: "Ksh 18,000",
    items: [
      "Fruit Cake",
      "Plastic Icing",
      "Drapes",
      "Sugar Flowers & Roses",
      "Leaves",
      "Moulded Decorations",
      "Wedding Set Ups",
      "Traditional African Pot Wedding Cake",
      "Company Logo",
    ],
  },
]

const shortCourses = [
  {
    title: "Short Course 1: Basic Cake Making & Decorations",
    items: [
      "Queen Cakes",
      "Vanilla Cakes",
      "Carrot Cakes",
      "Coconut Cakes",
      "Marble Roll",
      "Chocolate Cake",
      "Pizza",
      "Tea Scones",
    ],
  },
  {
    title: "Short Course 2: Pies, Pastries & Desserts",
    items: [
      "Pizza",
      "Doughnuts",
      "Chocolate Eclairs",
      "Samosa",
      "Mahamri",
      "Mandazi",
      "Downy Brioche",
      "Sweet Bread",
    ],
  },
  {
    title: "Short Course 3: Bread & Bread Products",
    items: [
      "White Bread",
      "White Buns",
      "Brown Buns",
      "Sweet Bread",
    ],
  },
]

const yoghurtCourses = [
  "Blueberry yoghurt",
  "Strawberry yoghurt",
  "Raspberry yoghurt",
  "Pineapple yoghurt",
  "Passion yoghurt",
  "Any other flavour",
]

export default function SchoolPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(140deg,#f6f2f7_0%,#eef1f8_55%,#eaeef7_100%)] text-slate-900">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.6),transparent_50%)]" />
        <div className="absolute -left-28 top-[-8rem] h-72 w-72 rounded-full bg-[#4d66e8]/25 blur-[140px]" />
        <div className="absolute right-[-10rem] top-[-7rem] h-72 w-72 rounded-full bg-[#f3a6cc]/35 blur-[160px]" />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 lg:pt-24">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-700 shadow-sm">
                School of Cakes
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-semibold leading-tight">
                Japhe&apos;s Cake House School
              </h1>
              <p className="text-lg text-slate-700 max-w-xl">
                Learn professional cake making, decoration, bread products, pastries, and desserts with hands-on guidance.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="tel:+254708244764"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0f1116] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#191c24]"
                >
                  <Phone className="h-4 w-4" />
                  Call to Enroll
                </Link>
                <Link
                  href="https://wa.me/254708244764"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5"
                >
                  <Sparkles className="h-4 w-4 text-[var(--brand-magenta-deep)]" />
                  WhatsApp Us
                </Link>
              </div>
            </div>

            <div className="lux-card p-8 md:p-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Special Offer</p>
                  <p className="text-3xl font-serif font-semibold text-slate-900 mt-2">20% off</p>
                  <p className="text-sm text-slate-600">Applies to all courses</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-blue))] text-white">
                  <BadgeCheck className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                  <span>Flexible intakes - start this month</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-slate-500" />
                  <span>Certificate issued on completion</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span>Witeithie Town, Thika Super Highway</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="lux-card p-8 md:p-10">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Fees Structure</p>
              <h2 className="text-2xl font-serif font-semibold text-slate-900">Transparent pricing</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[var(--brand-cream)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
              Paybill 982100
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fees.map((fee) => (
              <div key={fee.label} className="rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-4">
                <p className="text-sm text-slate-500">{fee.label}</p>
                <p className="text-lg font-semibold text-slate-900">{fee.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-sm text-slate-600">
            School fees to be paid to Imarisha Sacco Account. Account number: <span className="font-semibold text-slate-800">5040323411</span>.
          </div>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
            Minimum of <span className="font-semibold">Ksh 10,000</span> must be paid before enrollment.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Curriculum</p>
            <h2 className="text-3xl font-serif font-semibold text-slate-900">Full Courses</h2>
          </div>
          <span className="text-sm text-slate-600">Hands-on, practical, and business-ready.</span>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {curriculum.map((course) => (
            <div key={course.title} className="lux-card p-6 flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">{course.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                  <span>Duration: {course.duration}</span>
                  <span>Cost: {course.cost}</span>
                </div>
              </div>
              <ul className="mt-2 grid gap-2 text-sm text-slate-600">
                {course.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-magenta)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="lux-card p-8 md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Short Courses</p>
              <h2 className="text-2xl font-serif font-semibold text-slate-900">5-day intensives</h2>
              <p className="text-sm text-slate-600">Duration: 5 days · Cost: Ksh 8,000</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
              Quick skills upgrade
            </span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {shortCourses.map((course) => (
              <div key={course.title} className="rounded-[24px] border border-slate-200/70 bg-white/70 p-6">
                <h3 className="text-base font-semibold text-slate-900">{course.title}</h3>
                <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                  {course.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="lux-card p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Yoghurt & Milkshake</p>
            <h2 className="text-2xl font-serif font-semibold text-slate-900">2-day course</h2>
            <p className="text-sm text-slate-600">Duration: 2 days · Cost: Ksh 6,000</p>
            <div className="mt-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              {yoghurtCourses.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-magenta-deep)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lux-card p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Booking & Enquiries</p>
            <h3 className="text-xl font-serif font-semibold text-slate-900">Let&apos;s get you enrolled</h3>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-500" />
                <span>0708244764</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-slate-500 mt-1" />
                <span>Witeithie Town along Thika Super Highway</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="tel:+254708244764"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0f1116] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#191c24]"
              >
                Call Now
              </Link>
              <Link
                href="https://wa.me/254708244764"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
              >
                WhatsApp Us
              </Link>
            </div>
            <div className="mt-6 text-xs text-slate-500">
              Paybill: 982100 · Account: 5040323411 (Imarisha Sacco)
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
