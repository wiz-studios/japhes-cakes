"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus } from "lucide-react"

export function ZoneForm() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const { error } = await supabase.from("delivery_zones").insert({
      name: formData.get("name"),
      delivery_fee: formData.get("fee"),
      delivery_window: formData.get("window"),
      allows_cake: formData.get("allows_cake") === "on",
      allows_pizza: formData.get("allows_pizza") === "on",
      scheduled_only: formData.get("scheduled_only") === "on",
    })

    if (!error) {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2" size={16} /> Add Zone
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Delivery Zone</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Zone Name</Label>
            <Input name="name" required placeholder="e.g. Ruiru Delivery" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fee (KES)</Label>
              <Input name="fee" type="number" required placeholder="150" />
            </div>
            <div className="space-y-2">
              <Label>Window</Label>
              <Input name="window" required placeholder="1-2 hours" />
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="allows_cake" name="allows_cake" defaultChecked />
              <label htmlFor="allows_cake" className="text-sm font-medium">
                Allows Cake
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="allows_pizza" name="allows_pizza" defaultChecked />
              <label htmlFor="allows_pizza" className="text-sm font-medium">
                Allows Pizza
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="scheduled_only" name="scheduled_only" />
              <label htmlFor="scheduled_only" className="text-sm font-medium">
                Scheduled Only (e.g. Nairobi)
              </label>
            </div>
          </div>
          <Button type="submit" className="w-full mt-4">
            Save Zone
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
