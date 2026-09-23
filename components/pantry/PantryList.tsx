"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Carrot, ScanLine, X, Loader2, Pencil } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getPantryItems, deletePantryItem } from "@/lib/supabase/queries"
import type { PantryItemWithIngredient } from "@/types/pantry"
import { AddIngredientDialog } from "./AddIngredientDialog"
import { EditPantryItemDialog } from "./EditPantryItemDialog"

function formatQuantity(quantity: number) {
  return Number.isInteger(quantity) ? String(quantity) : String(quantity)
}

export function PantryList() {
  const { data, error, isLoading, mutate } = useSWR<PantryItemWithIngredient[]>("pantry_items", getPantryItems)

  const [editItem, setEditItem] = useState<PantryItemWithIngredient | null>(null)
  const [removeItem, setRemoveItem] = useState<PantryItemWithIngredient | null>(null)
  const [removing, setRemoving] = useState(false)

  const items = data ?? []
  const existingIngredientIds = items.map((i) => i.ingredient_id)

  async function confirmRemove() {
    if (!removeItem) return
    setRemoving(true)
    try {
      await deletePantryItem(removeItem.id)
      toast.success(`Removed ${removeItem.ingredient.name}`)
      setRemoveItem(null)
      await mutate()
    } catch {
      toast.error("Couldn't remove the item. Please try again.")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <section aria-labelledby="pantry-heading">
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle id="pantry-heading" className="flex items-center gap-2 text-base">
            <Carrot className="size-5 text-primary" aria-hidden="true" />
            Pantry
          </CardTitle>
          <AddIngredientDialog
            existingIngredientIds={existingIngredientIds}
            onAdded={() => {
              toast.success("Added to your pantry")
              mutate()
            }}
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading your pantry…
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
              <p className="text-sm font-medium text-destructive">We couldn&apos;t load your pantry.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => mutate()}>
                Try again
              </Button>
            </div>
          )}

          {!isLoading && !error && items.length === 0 && (
            <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">Your pantry is empty.</p>
              <p className="text-sm text-muted-foreground">Add ingredients manually or scan a supermarket bill.</p>
            </div>
          )}

          {!isLoading && !error && items.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="Pantry ingredients">
              {items.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 py-2 pl-3.5 pr-2">
                    <button
                      type="button"
                      onClick={() => setEditItem(item)}
                      className="flex flex-1 items-center justify-between gap-3 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Edit ${item.ingredient.name}`}
                    >
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        {item.ingredient.name}
                        <Pencil className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatQuantity(item.quantity)} {item.unit}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveItem(item)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Remove ${item.ingredient.name}`}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Button type="button" variant="outline" disabled className="w-full justify-center gap-2 bg-transparent">
            <ScanLine className="size-4" aria-hidden="true" />
            Scan supermarket bill
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Soon
            </span>
          </Button>
        </CardContent>
      </Card>

      <EditPantryItemDialog
        item={editItem}
        onOpenChange={(open) => {
          if (!open) setEditItem(null)
        }}
        onSaved={() => {
          toast.success("Pantry updated")
          mutate()
        }}
      />

      <AlertDialog open={removeItem !== null} onOpenChange={(open: boolean) => !open && setRemoveItem(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeItem?.ingredient.name} from your pantry?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the item from your pantry.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel disabled={removing} className="mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault()
                confirmRemove()
              }}
              disabled={removing}
              className="gap-2 bg-destructive text-white hover:bg-destructive/90"
            >
              {removing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
