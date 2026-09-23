"use client"

import { useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type RecipeIngredient = {
  localId: string
  ingredientName: string
  quantity: string
  unit: string
  required: boolean
}

type RecipeFormProps = {
  userId: string
  householdId: string
  onSaved?: () => void
  onCancel?: () => void
}

const emptyIngredient = (): RecipeIngredient => ({
  localId: crypto.randomUUID(),
  ingredientName: "",
  quantity: "",
  unit: "g",
  required: true,
})

export function RecipeForm({
  userId,
  householdId,
  onSaved,
  onCancel,
}: RecipeFormProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState<"gravy" | "poriyal" | "other">("gravy")
  const [servings, setServings] = useState("2")
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    emptyIngredient(),
  ])
  const [steps, setSteps] = useState<string[]>([""])
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function addIngredient() {
    setIngredients((current) => [...current, emptyIngredient()])
  }

  function removeIngredient(localId: string) {
    setIngredients((current) =>
      current.filter((ingredient) => ingredient.localId !== localId),
    )
  }

  function updateIngredient(
    localId: string,
    field: keyof RecipeIngredient,
    value: string | boolean,
  ) {
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.localId === localId
          ? { ...ingredient, [field]: value }
          : ingredient,
      ),
    )
  }

  function addStep() {
    setSteps((current) => [...current, ""])
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, i) => i !== index))
  }

  function updateStep(index: number, value: string) {
    setSteps((current) =>
      current.map((step, i) => (i === index ? value : step)),
    )
  }

  async function saveRecipe() {
    setError("")

    const trimmedName = name.trim()

    if (!trimmedName) {
      setError("Please enter a recipe name.")
      return
    }

    const validIngredients = ingredients.filter(
      (ingredient) => ingredient.ingredientName.trim(),
    )

    if (validIngredients.length === 0) {
      setError("Add at least one ingredient.")
      return
    }

    setSaving(true)

    try {
      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          household_id: householdId,
          name: trimmedName,
          type,
          servings: Math.max(1, Number(servings) || 1),
          notes: notes.trim() || null,
        })
        .select("id")
        .single()

      if (recipeError || !recipe) {
        throw recipeError ?? new Error("Could not create recipe.")
      }

      const ingredientRows = validIngredients.map((ingredient) => ({
        recipe_id: recipe.id,
        ingredient_name: ingredient.ingredientName.trim(),
        quantity: ingredient.quantity
          ? Number(ingredient.quantity)
          : null,
        unit: ingredient.unit.trim() || null,
        required: ingredient.required,
      }))

      const { error: ingredientError } = await supabase
        .from("recipe_ingredients")
        .insert(ingredientRows)

      if (ingredientError) {
        await supabase.from("recipes").delete().eq("id", recipe.id)
        throw ingredientError
      }

      const validSteps = steps
        .map((step) => step.trim())
        .filter(Boolean)

      if (validSteps.length > 0) {
        const stepRows = validSteps.map((instruction, index) => ({
          recipe_id: recipe.id,
          step_number: index + 1,
          instruction,
        }))

        const { error: stepError } = await supabase
          .from("recipe_steps")
          .insert(stepRows)

        if (stepError) {
          await supabase.from("recipes").delete().eq("id", recipe.id)
          throw stepError
        }
      }

      onSaved?.()
    } catch (err: any) {
      console.error("Could not save recipe:", err)
      setError(err?.message ?? "Could not save recipe.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Add Recipe</h2>
          <p className="text-sm text-muted-foreground">
            Save your household&apos;s own version.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex size-9 items-center justify-center rounded-full border border-border"
            aria-label="Cancel"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipe details</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Recipe name
            </label>

            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Our Sambar"
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
                      | "other",
                  )
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                onChange={(event) => setServings(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Ingredients
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <div
              key={ingredient.localId}
              className="rounded-xl border border-border p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Ingredient {index + 1}
                </span>

                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      removeIngredient(ingredient.localId)
                    }
                    className="text-muted-foreground"
                    aria-label="Remove ingredient"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <Input
                  value={ingredient.ingredientName}
                  onChange={(event) =>
                    updateIngredient(
                      ingredient.localId,
                      "ingredientName",
                      event.target.value,
                    )
                  }
                  placeholder="Ingredient name"
                />

                <div className="grid grid-cols-[1fr_1fr] gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={ingredient.quantity}
                    onChange={(event) =>
                      updateIngredient(
                        ingredient.localId,
                        "quantity",
                        event.target.value,
                      )
                    }
                    placeholder="Quantity"
                  />

                  <Input
                    value={ingredient.unit}
                    onChange={(event) =>
                      updateIngredient(
                        ingredient.localId,
                        "unit",
                        event.target.value,
                      )
                    }
                    placeholder="Unit (g, ml, pcs...)"
                  />
                </div>

                <label className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                  <span>
                    {ingredient.required
                      ? "Required ingredient"
                      : "Optional ingredient"}
                  </span>

                  <input
                    type="checkbox"
                    checked={ingredient.required}
                    onChange={(event) =>
                      updateIngredient(
                        ingredient.localId,
                        "required",
                        event.target.checked,
                      )
                    }
                    className="size-4"
                  />
                </label>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addIngredient}
            className="w-full gap-2"
          >
            <Plus className="size-4" />
            Add ingredient
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Cooking steps
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-start gap-2"
            >
              <span className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                {index + 1}
              </span>

              <textarea
                value={step}
                onChange={(event) =>
                  updateStep(index, event.target.value)
                }
                placeholder={`Step ${index + 1}`}
                className="min-h-20 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />

              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="mt-2 text-muted-foreground"
                  aria-label="Remove step"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addStep}
            className="w-full gap-2"
          >
            <Plus className="size-4" />
            Add step
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>

        <CardContent>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything special about your household's version?"
            className="min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={saveRecipe}
        disabled={saving}
        className="w-full"
      >
        {saving ? "Saving recipe…" : "Save recipe"}
      </Button>
    </section>
  )
}