import { listSchoolInquiriesAdmin } from "@/app/actions/school-inquiries"
import SchoolInquiryBoard from "@/components/admin/SchoolInquiryBoard"
import type { SchoolInquiry } from "@/lib/school-inquiries"

export default async function AdminSchoolInquiriesPage() {
  const result = await listSchoolInquiriesAdmin()
  const inquiries: SchoolInquiry[] = result.success ? result.data : []

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">School CRM</p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Inquiry Mini-Board</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track school leads, move them through follow-up stages, and keep admissions conversion visible in one place.
        </p>
      </div>

      {!result.success && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {result.error || "Could not load school inquiries."}
        </div>
      )}

      <SchoolInquiryBoard initialInquiries={inquiries} />
    </div>
  )
}
