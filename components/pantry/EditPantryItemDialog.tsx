"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updatePantryItem, pantryItemUpdateSchema } from "@/lib/supabase/queries"
import { PANTRY_UNITS } from "@/types/pantry"
import type { PantryItemWithIngredient } from "@/types/pantry"

type EditPantryItemDialogProps = {
  item: PantryItemWithIngredient | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function EditPantryItemDialog({ item, onOpenChange, onSaved }: EditPantryItemDialogProps) {
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState<string>("g")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [initializedFor, setInitializedFor] = useState<string | null>(null)

  // Sync local state when a new item is opened.
  if (item && initializedFor !== item.id) {
    setInitializedFor(item.id)
    setQuantity(String(item.quantity))
    setUnit(item.unit)
    setError(null)
  }
  if (!item && initializedFor !== null) {
    setInitializedFor(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!item) return
    setError(null)

    const parsed = pantryItemUpdateSchema.safeParse({ quantity, unit })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your input.")
      return
    }

    setSubmitting(true)
    try {
      await updatePantryItem(item.id, parsed.data)
      onSaved()
      onOpenChange(false)
    } catch {
      setError("Couldn't save your changes. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit {item?.ingredient.name}</DialogTitle>
          <DialogDescription>Update the quantity or unit you have on hand.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-unit">Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v ?? "g")}>
                <SelectTrigger id="edit-unit" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PANTRY_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="h-11 w-full gap-2">
              {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
