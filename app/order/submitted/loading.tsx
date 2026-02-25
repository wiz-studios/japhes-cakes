export default function OrderSubmittedLoading() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4">
      <div className="h-10 w-40 animate-pulse rounded-md bg-slate-200" />
      <div className="mt-3 h-4 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-8 w-40 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  )
}
