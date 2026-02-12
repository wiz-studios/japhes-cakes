"use client"

import { FormEvent, useMemo, useState } from "react"
import { KENYA_PHONE_REGEX, normalizeKenyaPhone } from "@/lib/phone"

export default function SchoolInquiryForm() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [course, setCourse] = useState("")
  const [message, setMessage] = useState("")

  const isValid = useMemo(() => {
    return name.trim().length >= 2 && KENYA_PHONE_REGEX.test(phone) && course.trim().length > 0
  }, [name, phone, course])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid) return

    const text = [
      "Hello Japhe's School of Cake,",
      "",
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      `Course Interest: ${course.trim()}`,
      `Message: ${message.trim() || "N/A"}`,
    ].join("\n")

    window.open(`https://wa.me/254708244764?text=${encodeURIComponent(text)}`, "_blank")
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-slate-200/80 bg-white/70 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Quick Inquiry</p>
      <p className="mt-1 text-sm text-slate-700">Send a short course inquiry on WhatsApp.</p>

      <div className="mt-4 grid gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#6d177f]"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(normalizeKenyaPhone(e.target.value))}
          placeholder="07XXXXXXXX"
          inputMode="numeric"
          maxLength={10}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#6d177f]"
        />
        <input
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          placeholder="Course interest (e.g. Basic Course)"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#6d177f]"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message (optional)"
          rows={3}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6d177f]"
        />
      </div>

      {!isValid && (
        <p className="mt-3 text-xs text-slate-500">Enter name, valid phone (07/01), and course interest.</p>
      )}

      <button
        type="submit"
        disabled={!isValid}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#0f1116] px-5 text-sm font-semibold text-white transition hover:bg-[#191c24] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Send Inquiry
      </button>
    </form>
  )
}
