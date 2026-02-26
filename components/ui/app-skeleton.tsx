import { Skeleton } from "@/components/ui/skeleton"

export function StatusPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] px-6 py-12 md:px-10">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-5 w-full max-w-xl" />
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-4 h-8 w-52" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function ReceiptPageSkeleton() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4">
      <Skeleton className="h-10 w-40 rounded-full" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-white p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-8 w-40" />
      </div>
      <div className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-3 h-20 w-full" />
      </div>
    </div>
  )
}

export function OrderFormSkeleton({ accentClass = "bg-slate-300" }: { accentClass?: string }) {
  return (
    <div className="min-h-screen px-4 pb-10 pt-24">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <Skeleton className={`h-2 w-52 ${accentClass}`} />
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Skeleton className="h-6 w-48" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="mt-6 h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}
