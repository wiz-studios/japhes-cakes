"use client"

import { useMemo, useState, useTransition } from "react"
import { updateSchoolInquiryStatus } from "@/app/actions/school-inquiries"
import {
  SCHOOL_INQUIRY_STATUSES,
  type SchoolInquiry,
  type SchoolInquiryStatus,
} from "@/lib/school-inquiries"
import { maskPhoneNumber } from "@/lib/phone"

type Props = {
  initialInquiries: SchoolInquiry[]
}

export default function SchoolInquiryBoard({ initialInquiries }: Props) {
  const [inquiries, setInquiries] = useState(initialInquiries)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | SchoolInquiryStatus>("all")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return inquiries.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      if (!matchesStatus) return false
      if (!normalizedQuery) return true
      const haystack = [item.name, item.phone, item.course, item.message || ""].join(" ").toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [inquiries, query, statusFilter])

  const byStatus = useMemo(() => {
    return SCHOOL_INQUIRY_STATUSES.map((status) => ({
      status,
      count: inquiries.filter((item) => item.status === status).length,
    }))
  }, [inquiries])

  const onStatusChange = (id: string, nextStatus: SchoolInquiryStatus) => {
    setFeedback(null)
    const prev = inquiries
    setInquiries((current) => current.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)))

    startTransition(async () => {
      const result = await updateSchoolInquiryStatus({ id, status: nextStatus })
      if (!result.success) {
        setInquiries(prev)
        setFeedback(result.error || "Could not update inquiry status.")
        return
      }
      setFeedback("Inquiry status updated.")
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {byStatus.map((bucket) => (
          <button
            key={bucket.status}
            type="button"
            onClick={() => setStatusFilter(bucket.status)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              statusFilter === bucket.status
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">{bucket.status}</p>
            <p className="mt-1 text-2xl font-semibold">{bucket.count}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, phone, course..."
          className="h-10 min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none ring-0 focus:border-slate-400"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | SchoolInquiryStatus)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {SCHOOL_INQUIRY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {feedback && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">{feedback}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-600">{maskPhoneNumber(item.phone || "")}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">{item.course}</td>
                <td className="px-4 py-3 text-slate-600">{item.message || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={item.status}
                    onChange={(event) => onStatusChange(item.id, event.target.value as SchoolInquiryStatus)}
                    disabled={isPending}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs uppercase tracking-[0.1em]"
                  >
                    {SCHOOL_INQUIRY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(item.created_at).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-500">No inquiries match your filters yet.</div>
        )}
      </div>
    </div>
  )
}
