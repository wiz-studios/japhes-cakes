export const SCHOOL_INQUIRY_STATUSES = ["new", "contacted", "interested", "enrolled", "dropped"] as const

export type SchoolInquiryStatus = (typeof SCHOOL_INQUIRY_STATUSES)[number]

export type SchoolInquiry = {
  id: string
  name: string
  phone: string
  course: string
  message: string | null
  status: SchoolInquiryStatus
  email_sent: boolean
  source: string | null
  created_at: string
  updated_at: string
  last_contacted_at: string | null
}

export function isSchoolInquiryStatus(value: string): value is SchoolInquiryStatus {
  return (SCHOOL_INQUIRY_STATUSES as readonly string[]).includes(value)
}
