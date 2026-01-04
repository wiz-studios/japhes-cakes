import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ZoneForm } from "@/components/zone-form"

export default async function ZonesManagerPage() {
  const supabase = await createServerSupabaseClient()
  const { data: zones } = await supabase.from("delivery_zones").select("*").order("name")

  return (
    <div className="max-w-none space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Delivery Zones</h2>
        <ZoneForm />
      </div>

      <div className="border rounded-xl bg-card">
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
  )
}
