"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getIngredients, addPantryItem, pantryItemInputSchema } from "@/lib/supabase/queries"
import { PANTRY_UNITS } from "@/types/pantry"
import type { Ingredient } from "@/types/ingredient"

type AddIngredientDialogProps = {
  existingIngredientIds: string[]
  onAdded: () => void
}

export function AddIngredientDialog({ existingIngredientIds, onAdded }: AddIngredientDialogProps) {
  const [open, setOpen] = useState(false)
  const { data: ingredients } = useSWR<Ingredient[]>("ingredients", getIngredients)

  const [ingredientId, setIngredientId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState<string>("g")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const available = (ingredients ?? []).filter((i) => !existingIngredientIds.includes(i.id))
  const grouped = groupByCategory(available)

  function reset() {
    setIngredientId("")
    setQuantity("")
    setUnit("g")
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed = pantryItemInputSchema.safeParse({
      ingredient_id: ingredientId,
      quantity,
      unit,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your input.")
      return
    }

    setSubmitting(true)
    try {
      await addPantryItem(parsed.data)
      onAdded()
      setOpen(false)
      reset()
    } catch {
      setError("Couldn't add the ingredient. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button size="icon" aria-label="Add ingredient" className="size-10 shrink-0 rounded-full">
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        }
      />
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add ingredient</DialogTitle>
          <DialogDescription>Choose an ingredient and how much you have.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ingredient">Ingredient</Label>
            <Select value={ingredientId} onValueChange={(v) => setIngredientId(v ?? "")}>
              <SelectTrigger id="ingredient" className="h-11">
                <SelectValue placeholder="Select an ingredient" />
              </SelectTrigger>
              <SelectContent>
                {available.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Everything is already in your pantry.</p>
                )}
                {grouped.map(([category, items]) => (
                  <SelectGroup key={category}>
                    <SelectLabel>{category}</SelectLabel>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="500"
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v ?? "g")}>
                <SelectTrigger id="unit" className="h-11">
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
              Add to pantry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function groupByCategory(items: Ingredient[]): [string, Ingredient[]][] {
  const order = ["Legumes", "Vegetables", "Protein", "Grains"]
  const map = new Map<string, Ingredient[]>()
  for (const item of items) {
    const list = map.get(item.category) ?? []
    list.push(item)
    map.set(item.category, list)
  }
  return Array.from(map.entries()).sort((a, b) => {
    const ai = order.indexOf(a[0])
    const bi = order.indexOf(b[0])
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
}
