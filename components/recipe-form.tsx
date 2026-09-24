"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type RecipeIngredient = {
  localId: string
  ingredientName: string
  quantity: string
  unit: string
  required: boolean
  ingredientId?: string
}

type IngredientSuggestion = {
  id: string
  name: string
}

type RecipeFormProps = {
  userId: string
  householdId: string
  onSaved?: () => void
  onCancel?: () => void
}

export function RecipeForm({
  userId,
  householdId,
  onSaved,
  onCancel,
}: RecipeFormProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState<"gravy" | "poriyal" | "other">("gravy")
  const [servings, setServings] = useState("2")
  const [notes, setNotes] = useState("")

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    {
      localId: crypto.randomUUID(),
      ingredientName: "",
      quantity: "",
      unit: "",
      required: true,
    },
  ])

  const [steps, setSteps] = useState<string[]>([""])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function saveRecipe() {
    setError("")

    if (!name.trim()) {
      setError("Please enter a recipe name.")
      return
    }

    const validIngredients = ingredients.filter(
      (ingredient) => ingredient.ingredientName.trim()
    )

    if (validIngredients.length === 0) {
      setError("Please add at least one ingredient.")
      return
    }

    const validSteps = steps
      .map((step) => step.trim())
      .filter(Boolean)

    setSaving(true)

    try {
      // ─────────────────────────────────────────────
      // Create recipe
      // ─────────────────────────────────────────────

      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          household_id: householdId,
          name: name.trim(),
          type,
          servings: Number(servings) || 2,
          notes: notes.trim() || null,
        })
        .select("id")
        .single()

      if (recipeError || !recipe) {
        console.error("Could not create recipe:", recipeError)
        setError(recipeError?.message ?? "Could not create recipe.")
        return
      }

      // ─────────────────────────────────────────────
      // Save ingredients
      // ─────────────────────────────────────────────

      const ingredientRows = validIngredients.map((ingredient) => ({
        recipe_id: recipe.id,
        ingredient_id: ingredient.ingredientId ?? null,
        ingredient_name: ingredient.ingredientName.trim(),
        quantity: ingredient.quantity
          ? Number(ingredient.quantity)
          : null,
        unit: ingredient.unit.trim() || null,
        required: ingredient.required,
      }))

      const { error: ingredientsError } = await supabase
        .from("recipe_ingredients")
        .insert(ingredientRows)

      if (ingredientsError) {
        console.error(
          "Could not save recipe ingredients:",
          ingredientsError
        )

        // Remove the recipe if ingredient saving failed
        await supabase
          .from("recipes")
          .delete()
          .eq("id", recipe.id)

        setError(ingredientsError.message)
        return
      }

      // ─────────────────────────────────────────────
      // Save steps
      // ─────────────────────────────────────────────

      if (validSteps.length > 0) {
        const stepRows = validSteps.map((instruction, index) => ({
          recipe_id: recipe.id,
          step_number: index + 1,
          instruction,
        }))

        const { error: stepsError } = await supabase
          .from("recipe_steps")
          .insert(stepRows)

        if (stepsError) {
          console.error("Could not save recipe steps:", stepsError)

          // Remove the recipe if step saving failed
          await supabase
            .from("recipes")
            .delete()
            .eq("id", recipe.id)

          setError(stepsError.message)
          return
        }
      }

      onSaved?.()
    } catch (err) {
      console.error(err)
      setError("Something went wrong while saving the recipe.")
    } finally {
      setSaving(false)
    }
  }

  function addIngredientRow() {
    setIngredients((previous) => [
      ...previous,
      {
        localId: crypto.randomUUID(),
        ingredientName: "",
        quantity: "",
        unit: "",
        required: true,
      },
    ])
  }

  function removeIngredientRow(localId: string) {
    setIngredients((previous) => {
      if (previous.length === 1) {
        return previous
      }

      return previous.filter(
        (ingredient) => ingredient.localId !== localId
      )
    })
  }

  function updateIngredient(
    localId: string,
    changes: Partial<RecipeIngredient>
  ) {
    setIngredients((previous) =>
      previous.map((ingredient) =>
        ingredient.localId === localId
          ? {
              ...ingredient,
              ...changes,
            }
          : ingredient
      )
    )
  }

  function addStep() {
    setSteps((previous) => [...previous, ""])
  }

  function removeStep(index: number) {
    setSteps((previous) => {
      if (previous.length === 1) {
        return previous
      }

      return previous.filter((_, stepIndex) => stepIndex !== index)
    })
  }

  function updateStep(index: number, value: string) {
    setSteps((previous) =>
      previous.map((step, stepIndex) =>
        stepIndex === index ? value : step
      )
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Add Recipe</CardTitle>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ───────────────────────────────────────── */}
        {/* Recipe details */}
        {/* ───────────────────────────────────────── */}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Recipe name
            </label>

            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Tomato sambar"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type
              </label>

              <select
                value={type}
                onChange={(event) =>
                  setType(
                    event.target.value as
                      | "gravy"
                      | "poriyal"
                      | "other"
                  )
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="gravy">Gravy</option>
                <option value="poriyal">Poriyal</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Servings
              </label>

              <Input
                type="number"
                min="1"
                value={servings}
                onChange={(event) =>
                  setServings(event.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────── */}
        {/* Ingredients */}
        {/* ───────────────────────────────────────── */}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Ingredients
            </h3>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredientRow}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="space-y-4">
            {ingredients.map((ingredient) => (
              <IngredientRow
                key={ingredient.localId}
                ingredient={ingredient}
                onChange={(changes) =>
                  updateIngredient(
                    ingredient.localId,
                    changes
                  )
                }
                onRemove={() =>
                  removeIngredientRow(
                    ingredient.localId
                  )
                }
              />
            ))}
          </div>
        </div>

        {/* ───────────────────────────────────────── */}
        {/* Steps */}
        {/* ───────────────────────────────────────── */}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Cooking steps
            </h3>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStep}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add step
            </Button>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-2"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
                  {index + 1}
                </div>

                <textarea
                  value={step}
                  onChange={(event) =>
                    updateStep(index, event.target.value)
                  }
                  placeholder={`Step ${index + 1}`}
                  rows={2}
                  className="min-h-[72px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />

                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="mt-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ───────────────────────────────────────── */}
        {/* Notes */}
        {/* ───────────────────────────────────────── */}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Notes
          </label>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes about this recipe"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* ───────────────────────────────────────── */}
        {/* Error */}
        {/* ───────────────────────────────────────── */}

        {error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}

        {/* ───────────────────────────────────────── */}
        {/* Actions */}
        {/* ───────────────────────────────────────── */}

        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          )}

          <Button
            type="button"
            className="flex-1"
            onClick={saveRecipe}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Recipe"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ================================================= */
/* Ingredient row with autocomplete                  */
/* ================================================= */

type IngredientRowProps = {
  ingredient: RecipeIngredient
  onChange: (changes: Partial<RecipeIngredient>) => void
  onRemove: () => void
}

function IngredientRow({
  ingredient,
  onChange,
  onRemove,
}: IngredientRowProps) {
  const [suggestions, setSuggestions] = useState<
    IngredientSuggestion[]
  >([])

  const [showSuggestions, setShowSuggestions] =
    useState(false)

  const [searching, setSearching] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  // ─────────────────────────────────────────────
  // Search ingredient catalogue
  // ─────────────────────────────────────────────

  useEffect(() => {
    const searchText = ingredient.ingredientName.trim()

    if (!searchText) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      setSearching(true)

      const { data, error } = await supabase
        .from("ingredients")
        .select("id, name")
        .ilike("name", `${searchText}%`)
        .order("name", { ascending: true })
        .limit(8)

      if (cancelled) return

      setSearching(false)

      if (error) {
        console.error(
          "Could not search ingredients:",
          error
        )
        setSuggestions([])
        return
      }

      setSuggestions(data ?? [])
      setShowSuggestions((data ?? []).length > 0)
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [ingredient.ingredientName])

  // ─────────────────────────────────────────────
  // Close dropdown when clicking outside
  // ─────────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    )

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      )
    }
  }, [])

  function selectSuggestion(
    suggestion: IngredientSuggestion
  ) {
    onChange({
      ingredientName: suggestion.name,
      ingredientId: suggestion.id,
    })

    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        {/* Ingredient name */}
        <div
          ref={containerRef}
          className="relative"
        >
          <label className="mb-1 block text-xs text-muted-foreground">
            Ingredient
          </label>

          <Input
            value={ingredient.ingredientName}
            onChange={(event) => {
              onChange({
                ingredientName: event.target.value,
                ingredientId: undefined,
              })

              setShowSuggestions(true)
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            placeholder="Type ingredient..."
            autoComplete="off"
          />

          {/* Dropdown */}
          {showSuggestions &&
            ingredient.ingredientName.trim() &&
            (suggestions.length > 0 || searching) && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-background shadow-lg">
                {searching ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Searching…
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto py-1">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault()
                          selectSuggestion(suggestion)
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Remove */}
        <div className="pt-6">
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
            aria-label="Remove ingredient"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quantity / Unit / Required */}
      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Quantity
          </label>

          <Input
            type="number"
            min="0"
            step="any"
            value={ingredient.quantity}
            onChange={(event) =>
              onChange({
                quantity: event.target.value,
              })
            }
            placeholder="2"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Unit
          </label>

          <Input
            value={ingredient.unit}
            onChange={(event) =>
              onChange({
                unit: event.target.value,
              })
            }
            placeholder="pcs / g / tbsp"
          />
        </div>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={ingredient.required}
              onChange={(event) =>
                onChange({
                  required: event.target.checked,
                })
              }
              className="h-4 w-4"
            />
            Required
          </label>
        </div>
      </div>
    </div>
  )
}