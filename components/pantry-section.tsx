"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ScanLine, X, Carrot } from "lucide-react"

type PantrySectionProps = {
  items: string[]
  onAdd: (item: string) => void
  onRemove: (item: string) => void
}

export function PantrySection({ items, onAdd, onRemove }: PantrySectionProps) {
  const [value, setValue] = useState("")

  function handleAdd() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue("")
  }

  return (
    <section aria-labelledby="pantry-heading">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle id="pantry-heading" className="flex items-center gap-2 text-base">
            <Carrot className="size-5 text-primary" aria-hidden="true" />
            Pantry
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-wrap gap-2" aria-label="Pantry ingredients">
            {items.length === 0 && (
              <li className="text-sm text-muted-foreground">Your pantry is empty. Add an ingredient below.</li>
            )}
            {items.map((item) => (
              <li key={item}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary py-1.5 pl-3 pr-1.5 text-sm font-medium text-secondary-foreground">
                  {item}
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove ${item}`}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              handleAdd()
            }}
          >
            <label htmlFor="add-ingredient" className="sr-only">
              Add an ingredient
            </label>
            <Input
              id="add-ingredient"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Add an ingredient…"
              autoComplete="off"
            />
            <Button type="submit" size="icon" aria-label="Add ingredient" disabled={!value.trim()}>
              <Plus className="size-5" aria-hidden="true" />
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full justify-center gap-2 bg-transparent"
          >
            <ScanLine className="size-4" aria-hidden="true" />
            Scan supermarket bill
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Soon
            </span>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
