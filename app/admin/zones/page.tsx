import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ZoneForm } from "@/components/zone-form"

export default async function ZonesManagerPage() {
  const supabase = await createServerSupabaseClient()
  const { data: zones } = await supabase
    .from("delivery_zones")
    .select("id, name, delivery_fee, delivery_window, allows_cake, allows_pizza, scheduled_only")
    .order("name")

  return (
    <div className="max-w-none space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold">Delivery Zones</h2>
        <ZoneForm />
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:hidden">
          {zones?.map((zone) => (
            <article key={zone.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-slate-900">{zone.name}</p>
                  <p className="text-sm text-slate-600">{zone.delivery_fee} KES</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Window</p>
                  <p className="mt-1 text-sm text-slate-700">{zone.delivery_window}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {zone.allows_cake && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px]">Cake</span>}
                  {zone.allows_pizza && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px]">Pizza</span>
                  )}
                  {zone.scheduled_only && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">Sched Only</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Fee (KES)</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Capabilities</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones?.map((zone) => (
              <TableRow key={zone.id}>
                <TableCell className="font-bold">{zone.name}</TableCell>
                <TableCell>{zone.delivery_fee}</TableCell>
                <TableCell>{zone.delivery_window}</TableCell>
                <TableCell className="space-x-1">
                  {zone.allows_cake && <span className="text-[10px] px-2 py-0.5 bg-primary/10 rounded-full">Cake</span>}
                  {zone.allows_pizza && (
                    <span className="text-[10px] px-2 py-0.5 bg-accent/10 rounded-full">Pizza</span>
                  )}
                  {zone.scheduled_only && (
                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">Sched Only</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  )
}
