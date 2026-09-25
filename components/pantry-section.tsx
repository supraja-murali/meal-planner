"use client"

import { useEffect, useState } from "react"
import {
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

export type PantryItem = {
  id: string
  name: string
  quantity: number
  unit: string
  boughtAt: string
  availableForPlanning: boolean
}

type IngredientSuggestion = {
  id: string
  name: string
}

type PantrySectionProps = {
  items: PantryItem[]

  onAdd: (
    name: string,
    quantity: number,
    unit: string,
    boughtAt: string,
    availableForPlanning: boolean
  ) => void

  onRemove: (id: string) => void

  onUpdate: (
    id: string,
    quantity: number,
    unit: string,
    boughtAt: string
  ) => void

  onTogglePlanning: (
    id: string,
    available: boolean
  ) => void
}

const UNIT_OPTIONS = [
  "pcs",
  "g",
  "kg",
  "ml",
  "L",
  "tbsp",
  "tsp",
  "cup",
  "pack",
]

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10)
}

export function PantrySection({
  items,
  onAdd,
  onRemove,
  onUpdate,
  onTogglePlanning,
}: PantrySectionProps) {
  const [searchText, setSearchText] =
    useState("")

  const [suggestions, setSuggestions] =
    useState<IngredientSuggestion[]>([])

  const [searching, setSearching] =
    useState(false)

  const [showSuggestions, setShowSuggestions] =
    useState(false)

  const [selectedIngredient, setSelectedIngredient] =
    useState<IngredientSuggestion | null>(null)

  const [quantity, setQuantity] =
    useState("1")

  const [unit, setUnit] =
    useState("pcs")

  const [boughtAt, setBoughtAt] =
    useState(today())

  const [availableForPlanning, setAvailableForPlanning] =
    useState(true)

  const [editingId, setEditingId] =
    useState<string | null>(null)

  const [editQuantity, setEditQuantity] =
    useState("")

  const [editUnit, setEditUnit] =
    useState("pcs")

  const [editBoughtAt, setEditBoughtAt] =
    useState(today())

  useEffect(() => {
    const query = searchText.trim()

    if (!query || selectedIngredient) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    let cancelled = false

    const timer = window.setTimeout(
      async () => {
        setSearching(true)

        const {
          data,
          error,
        } = await supabase
          .from("ingredients")
          .select("id, name")
          .ilike(
            "name",
            `%${query}%`
          )
          .order("name", {
            ascending: true,
          })
          .limit(30)

        if (cancelled) return

        setSearching(false)

        if (error) {
          console.error(
            "Could not search ingredients:",
            error
          )
          setSuggestions([])
        } else {
          setSuggestions(data ?? [])
        }

        setShowSuggestions(true)
      },
      200
    )

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    searchText,
    selectedIngredient,
  ])

  function selectIngredient(
    ingredient: IngredientSuggestion
  ) {
    setSelectedIngredient(ingredient)
    setSearchText(ingredient.name)
    setSuggestions([])
    setShowSuggestions(false)
  }

  function clearIngredient() {
    setSelectedIngredient(null)
    setSearchText("")
    setSuggestions([])
    setShowSuggestions(false)
  }

  function handleAdd() {
    const quantityValue =
      Number(quantity)

    if (
      !selectedIngredient ||
      !Number.isFinite(quantityValue) ||
      quantityValue <= 0
    ) {
      return
    }

    if (
      items.some(
        (item) =>
          item.name.toLowerCase() ===
          selectedIngredient.name.toLowerCase()
      )
    ) {
      return
    }

    onAdd(
      selectedIngredient.name,
      quantityValue,
      unit,
      boughtAt || today(),
      availableForPlanning
    )

    clearIngredient()
    setQuantity("1")
    setUnit("pcs")
    setBoughtAt(today())
    setAvailableForPlanning(true)
  }

  function startEditing(item: PantryItem) {
    setEditingId(item.id)
    setEditQuantity(
      String(item.quantity)
    )
    setEditUnit(item.unit)
    setEditBoughtAt(item.boughtAt)
  }

  function cancelEditing() {
    setEditingId(null)
  }

  function saveEditing(item: PantryItem) {
    const value = Number(editQuantity)

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return
    }

    onUpdate(
      item.id,
      value,
      editUnit,
      editBoughtAt || today()
    )

    cancelEditing()
  }

  return (
    <section
      aria-labelledby="pantry-heading"
      className="flex flex-col gap-4"
    >
      <div>
        <h2
          id="pantry-heading"
          className="text-lg font-semibold"
        >
          Pantry
        </h2>

        <p className="text-sm text-muted-foreground">
          Select which ingredients the planner
          can use.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              Available ingredients
            </span>

            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {
                items.filter(
                  (item) =>
                    item.availableForPlanning
                ).length
              }{" "}
              selected
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Your pantry is empty.
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Add ingredients below.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => {
              const editing =
                editingId === item.id

              if (editing) {
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {item.name}
                      </span>

                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="text-muted-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={editQuantity}
                        onChange={(e) =>
                          setEditQuantity(
                            e.target.value
                          )
                        }
                      />

                      <select
                        value={editUnit}
                        onChange={(e) =>
                          setEditUnit(
                            e.target.value
                          )
                        }
                        className="rounded-md border border-border bg-background px-3 text-sm"
                      >
                        {UNIT_OPTIONS.map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <Input
                      type="date"
                      value={editBoughtAt}
                      onChange={(e) =>
                        setEditBoughtAt(
                          e.target.value
                        )
                      }
                    />

                    <Button
                      type="button"
                      onClick={() =>
                        saveEditing(item)
                      }
                      className="w-full gap-2"
                    >
                      <Check className="size-4" />
                      Save changes
                    </Button>
                  </div>
                )
              }

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onTogglePlanning(
                        item.id,
                        !item.availableForPlanning
                      )
                    }
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
                      item.availableForPlanning
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background"
                    }`}
                    aria-label={
                      item.availableForPlanning
                        ? `Exclude ${item.name}`
                        : `Include ${item.name}`
                    }
                  >
                    {item.availableForPlanning && (
                      <Check className="size-3.5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm font-medium ${
                          !item.availableForPlanning
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                      >
                        {item.name}
                      </p>

                      <span className="shrink-0 text-sm font-medium">
                        {item.quantity}{" "}
                        {item.unit}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Bought{" "}
                      {new Date(
                        `${item.boughtAt}T00:00:00`
                      ).toLocaleDateString(
                        "en-SE",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        startEditing(item)
                      }
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onRemove(item.id)
                      }
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-background p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">
            Add ingredient
          </h3>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Start typing to search the ingredient
            catalogue.
          </p>
        </div>

        <div className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={searchText}
              onChange={(e) => {
                setSelectedIngredient(null)
                setSearchText(e.target.value)
              }}
              onFocus={() => {
                if (
                  searchText.trim() &&
                  !selectedIngredient
                ) {
                  setShowSuggestions(true)
                }
              }}
              placeholder="Search ingredients…"
              autoComplete="off"
              className="pl-9 pr-10"
            />

            {searchText && (
              <button
                type="button"
                onClick={clearIngredient}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {showSuggestions &&
            !selectedIngredient &&
            searchText.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                {searching ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    Searching…
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="py-1">
                    {suggestions.map(
                      (ingredient) => {
                        const alreadyAdded =
                          items.some(
                            (item) =>
                              item.name.toLowerCase() ===
                              ingredient.name.toLowerCase()
                          )

                        return (
                          <button
                            key={ingredient.id}
                            type="button"
                            disabled={
                              alreadyAdded
                            }
                            onClick={() =>
                              selectIngredient(
                                ingredient
                              )
                            }
                            className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm ${
                              alreadyAdded
                                ? "cursor-not-allowed opacity-40"
                                : "hover:bg-muted"
                            }`}
                          >
                            <span>
                              {ingredient.name}
                            </span>

                            {alreadyAdded && (
                              <span className="text-xs text-muted-foreground">
                                Already added
                              </span>
                            )}
                          </button>
                        )
                      }
                    )}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    No ingredients found.
                  </div>
                )}
              </div>
            )}
        </div>

        {selectedIngredient && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Check className="size-4 shrink-0 text-primary" />

              <span className="truncate text-sm font-medium">
                {selectedIngredient.name}
              </span>
            </div>

            <button
              type="button"
              onClick={clearIngredient}
              className="text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Input
            type="number"
            min="0.1"
            step="0.1"
            value={quantity}
            onChange={(e) =>
              setQuantity(e.target.value)
            }
            placeholder="Quantity"
          />

          <select
            value={unit}
            onChange={(e) =>
              setUnit(e.target.value)
            }
            className="rounded-md border border-border bg-background px-3 text-sm"
          >
            {UNIT_OPTIONS.map((option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Date bought
          </label>

          <Input
            type="date"
            value={boughtAt}
            onChange={(e) =>
              setBoughtAt(e.target.value)
            }
          />
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={availableForPlanning}
            onChange={(e) =>
              setAvailableForPlanning(
                e.target.checked
              )
            }
            className="size-4 rounded border-border"
          />

          <span>
            Use this ingredient for meal
            planning
          </span>
        </label>

        <Button
          type="button"
          onClick={handleAdd}
          disabled={
            !selectedIngredient ||
            !quantity ||
            Number(quantity) <= 0
          }
          className="mt-4 w-full gap-2"
        >
          <Plus className="size-4" />
          Add to pantry
        </Button>
      </div>
    </section>
  )
}