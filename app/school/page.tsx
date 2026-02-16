import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, CalendarClock, GraduationCap, MapPin, Phone, Sparkles } from "lucide-react"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { SchoolGalleryItem } from "@/lib/school-gallery"
import SchoolGallerySection from "@/components/school/SchoolGallerySection"
import SchoolInquiryForm from "@/components/school/SchoolInquiryForm"

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

const yoghurtCourseHighlights = [
  {
    title: "Cake Finishing Inspiration",
    image: "/images/premium-cake.jpg",
    alt: "Beautiful decorated cake display",
  },
  {
    title: "Pizza Craft Session",
    image: "/images/premium-pizza.jpg",
    alt: "Freshly prepared gourmet pizza",
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

const yoghurtCoursePerks = [
  {
    title: "Starter Kit Guidance",
    description: "Learn exactly which affordable tools and ingredients to buy so you can start selling immediately.",
  },
  {
    title: "Business Tips",
    description: "Pricing, packaging, and customer service tips to help you turn your skill into daily income.",
  },
  {
    title: "Practical Recipes",
    description: "Step-by-step recipes for creamy yoghurt and rich milkshakes with consistent flavor every batch.",
  },
]

export default async function SchoolPage() {
  const supabase = await createServerSupabaseClient()
  const { data: galleryRows } = await supabase
    .from("school_gallery")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  const galleryItems = ((galleryRows || []) as SchoolGalleryItem[]).filter(
    (item) => item.title !== "Pizza Shop Interior" && item.title !== "Cake Shop Front"
  )

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
                Japhe&apos;s School of Cake
              </h1>
              <p className="max-w-xl text-lg text-slate-700">
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
                  href="#fees"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5"
                >
                  <Sparkles className="h-4 w-4" />
                  View Fees
                </Link>
              </div>

              <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-4 py-3">
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                  <span>Flexible intakes - start this month</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-4 py-3">
                  <GraduationCap className="h-4 w-4 text-slate-500" />
                  <span>Certificate issued on completion</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-4 py-3 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span>Witeithie Town, Thika Super Highway</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-[#9db0ff]/40 blur-2xl" />
              <div className="lux-card relative overflow-hidden p-4 md:p-5">
                <div className="relative h-64 overflow-hidden rounded-2xl">
                  <Image src="/shop-cake.jpg" alt="Students practicing cake decoration" fill className="object-cover" priority />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-white/85 px-3 py-2 backdrop-blur">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Next intake</p>
                      <p className="text-sm font-semibold text-slate-900">Limited slots available</p>
                    </div>
                    <BadgeCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-slate-200/70 bg-white/90 px-2 py-3">
                    <p className="text-lg font-semibold text-slate-900">3</p>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Levels</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/70 bg-white/90 px-2 py-3">
                    <p className="text-lg font-semibold text-slate-900">5+</p>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Short courses</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/70 bg-white/90 px-2 py-3">
                    <p className="text-lg font-semibold text-slate-900">2-day</p>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Quick class</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SchoolGallerySection items={galleryItems} />

      <section id="fees" className="mx-auto max-w-6xl px-6 pb-10">
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
            School fees to be paid to Imarisha Sacco Account. Account number:{" "}
            <span className="font-semibold text-slate-800">5040323411</span>.
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
              <p className="text-sm text-slate-600">Duration: 5 days - Cost: Ksh 8,000</p>
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
        <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="lux-card self-start p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Yoghurt & Milkshake</p>
            <h2 className="text-2xl font-serif font-semibold text-slate-900">2-day course</h2>
            <p className="text-sm text-slate-600">Duration: 2 days - Cost: Ksh 6,000</p>
            <div className="mt-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              {yoghurtCourses.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-magenta-deep)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {yoghurtCourseHighlights.map((highlight) => (
                <div key={highlight.title} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm">
                  <div className="relative h-32 w-full">
                    <Image
                      src={highlight.image}
                      alt={highlight.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 280px"
                    />
                  </div>
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">{highlight.title}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">What You&apos;ll Gain</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {yoghurtCoursePerks.map((perk) => (
                  <div key={perk.title} className="rounded-xl border border-slate-200/70 bg-white px-3 py-3">
                    <p className="text-sm font-semibold text-slate-900">{perk.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{perk.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
              <p className="font-semibold">Bonus included: Free tasting + feedback session on the final day.</p>
              <p className="mt-1 text-xs text-emerald-800/90">
                Bring your questions and we&apos;ll help you refine texture, sweetness, and presentation for market-ready products.
              </p>
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
            <SchoolInquiryForm />
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
              Paybill: 982100 - Account: 5040323411 (Imarisha Sacco)
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
