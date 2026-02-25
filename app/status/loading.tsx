export default function OrderStatusLoading() {
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-12 md:px-10">
        <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-56 animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-full max-w-xl animate-pulse rounded bg-slate-200" />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-8 w-52 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  )
}
