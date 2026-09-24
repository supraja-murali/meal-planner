"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Check,
  CircleAlert,
  Star,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type PantryItem = {
  id: string
  name: string
  quantity: number
  unit: string
}

type RecipeIngredient = {
  id: string
  ingredient_id: string | null
  ingredient_name: string
  quantity: number | null
  unit: string | null
  required: boolean
}

type RecipeStep = {
  id: string
  step_number: number
  instruction: string
}

type Recipe = {
  id: string
  name: string
  type: string
  servings: number
  notes: string | null
}

type MealHistory = {
  id: string
  cooked_at: string
  rating: number | null
  notes: string | null
}

type CookingSessionProps = {
  recipeId: string
  householdId: string
  pantry: PantryItem[]
  onBack: () => void
  onFinished: () => void
}

export function CookingSession({
  recipeId,
  householdId,
  pantry,
  onBack,
  onFinished,
}: CookingSessionProps) {
  const [recipe, setRecipe] =
    useState<Recipe | null>(null)

  const [ingredients, setIngredients] =
    useState<RecipeIngredient[]>([])

  const [steps, setSteps] =
    useState<RecipeStep[]>([])

  const [history, setHistory] =
    useState<MealHistory[]>([])

  const [selectedIds, setSelectedIds] =
    useState<string[]>([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [finished, setFinished] =
    useState(false)

  const [rating, setRating] =
    useState<number | null>(null)

  const [notes, setNotes] =
    useState("")

  const [error, setError] =
    useState("")

  // ─────────────────────────────────────────────
  // Load recipe
  // ─────────────────────────────────────────────

  useEffect(() => {
    loadRecipe()
  }, [recipeId])

  async function loadRecipe() {
    setLoading(true)
    setError("")

    const [
      recipeResult,
      ingredientResult,
      stepsResult,
      historyResult,
    ] = await Promise.all([
      supabase
        .from("recipes")
        .select(
          "id, name, type, servings, notes"
        )
        .eq("id", recipeId)
        .single(),

      supabase
        .from("recipe_ingredients")
        .select(
          "id, ingredient_id, ingredient_name, quantity, unit, required"
        )
        .eq("recipe_id", recipeId)
        .order("created_at", {
          ascending: true,
        }),

      supabase
        .from("recipe_steps")
        .select(
          "id, step_number, instruction"
        )
        .eq("recipe_id", recipeId)
        .order("step_number", {
          ascending: true,
        }),

      supabase
        .from("meal_history")
        .select(
          "id, cooked_at, rating, notes"
        )
        .eq("household_id", householdId)
        .eq("recipe_id", recipeId)
        .order("cooked_at", {
          ascending: false,
        })
        .limit(10),
    ])

    if (
      recipeResult.error ||
      !recipeResult.data
    ) {
      console.error(
        "Could not load recipe:",
        recipeResult.error
      )

      setError("Could not load this recipe.")
      setLoading(false)
      return
    }

    if (ingredientResult.error) {
      console.error(
        "Could not load ingredients:",
        ingredientResult.error
      )
    }

    if (stepsResult.error) {
      console.error(
        "Could not load recipe steps:",
        stepsResult.error
      )
    }

    if (historyResult.error) {
      console.error(
        "Could not load meal history:",
        historyResult.error
      )
    }

    const loadedIngredients =
      ingredientResult.data ?? []

    setRecipe(recipeResult.data)
    setIngredients(loadedIngredients)
    setSteps(stepsResult.data ?? [])
    setHistory(historyResult.data ?? [])

    // Automatically select ingredients
    // that are currently available.
    const initiallySelected =
      loadedIngredients
        .filter((ingredient) =>
          isIngredientAvailable(
            ingredient,
            pantry
          )
        )
        .map((ingredient) => ingredient.id)

    setSelectedIds(initiallySelected)

    setLoading(false)
  }

  // ─────────────────────────────────────────────
  // Ingredient matching
  // ─────────────────────────────────────────────

  function normalize(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
  }

  function isIngredientAvailable(
    ingredient: RecipeIngredient,
    pantryItems: PantryItem[]
  ) {
    return pantryItems.some((pantryItem) => {
      const sameName =
        normalize(pantryItem.name) ===
        normalize(ingredient.ingredient_name)

      return sameName
    })
  }

  const availability = useMemo(() => {
    const result: Record<string, boolean> = {}

    for (const ingredient of ingredients) {
      result[ingredient.id] =
        isIngredientAvailable(
          ingredient,
          pantry
        )
    }

    return result
  }, [ingredients, pantry])

  const missingRequired =
    ingredients.filter(
      (ingredient) =>
        ingredient.required &&
        !availability[ingredient.id]
    )

  const missingOptional =
    ingredients.filter(
      (ingredient) =>
        !ingredient.required &&
        !availability[ingredient.id]
    )

  const selectedIngredients =
    ingredients.filter((ingredient) =>
      selectedIds.includes(ingredient.id)
    )

  // ─────────────────────────────────────────────
  // Toggle ingredient
  // ─────────────────────────────────────────────

  function toggleIngredient(id: string) {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter(
            (item) => item !== id
          )
        : [...previous, id]
    )
  }

  // ─────────────────────────────────────────────
  // Use available ingredients
  // ─────────────────────────────────────────────

  function useAvailableIngredients() {
    const availableIds = ingredients
      .filter(
        (ingredient) =>
          availability[ingredient.id]
      )
      .map((ingredient) => ingredient.id)

    setSelectedIds(availableIds)
  }

  // ─────────────────────────────────────────────
  // Save cooking session
  // ─────────────────────────────────────────────

  async function saveCookingSession() {
    if (!recipe) return

    setSaving(true)
    setError("")

    const { data, error: insertError } =
      await supabase
        .from("meal_history")
        .insert({
          household_id: householdId,
          recipe_id: recipe.id,
          cooked_at: new Date().toISOString(),
          rating: null,
          notes: null,
          selected_ingredient_ids:
            selectedIds,
        })
        .select(
          "id, cooked_at, rating, notes"
        )
        .single()

    if (insertError || !data) {
      console.error(
        "Could not save cooking session:",
        insertError
      )

      setError(
        "Could not save this cooking session."
      )

      setSaving(false)
      return
    }

    // Add the newly created session to local history.
    setHistory((previous) => [
      data,
      ...previous,
    ])

    setFinished(true)
    setSaving(false)
  }

  // ─────────────────────────────────────────────
  // Save rating and notes
  // ─────────────────────────────────────────────

  async function saveRatingAndFinish() {
    const latestMeal = history[0]

    if (!latestMeal) {
      onFinished()
      return
    }

    setSaving(true)
    setError("")

    const { error: updateError } =
      await supabase
        .from("meal_history")
        .update({
          rating,
          notes: notes.trim() || null,
        })
        .eq("id", latestMeal.id)

    if (updateError) {
      console.error(
        "Could not save rating:",
        updateError
      )

      setError(
        "Could not save your rating."
      )

      setSaving(false)
      return
    }

    setHistory((previous) =>
      previous.map((item) =>
        item.id === latestMeal.id
          ? {
              ...item,
              rating,
              notes:
                notes.trim() || null,
            }
          : item
      )
    )

    setSaving(false)
    onFinished()
  }

  // ─────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Loading recipe…
        </p>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Recipe not found
  // ─────────────────────────────────────────────

  if (!recipe) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-muted-foreground"
        >
          ← My Recipes
        </button>

        <p className="text-sm text-destructive">
          {error || "Recipe not found."}
        </p>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Finished cooking
  // ─────────────────────────────────────────────

  if (finished) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={onFinished}
          className="text-sm font-medium text-muted-foreground"
        >
          ← My Recipes
        </button>

        <Card>
          <CardContent className="space-y-5 pt-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-7 w-7 text-primary" />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                {recipe.name} cooked!
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Your cooking session has been saved.
              </p>
            </div>

            <div className="space-y-3 text-left">
              <label className="text-sm font-medium">
                How was it?
              </label>

              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setRating(value)
                      }
                      aria-label={`${value} star${
                        value === 1
                          ? ""
                          : "s"
                      }`}
                      className="rounded-md p-2"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          rating !== null &&
                          value <= rating
                            ? "fill-current"
                            : ""
                        }`}
                      />
                    </button>
                  )
                )}
              </div>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Any notes for next time?"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              className="w-full"
              onClick={saveRatingAndFinish}
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : "Save & Done"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Cooking screen
  // ─────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-muted-foreground"
      >
        ← My Recipes
      </button>

      <div>
        <h1 className="text-2xl font-bold">
          {recipe.name}
        </h1>

        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {recipe.type} · {recipe.servings} servings
        </p>
      </div>

      {/* ───────────────────────────────────────── */}
      {/* Missing required ingredients */}
      {/* ───────────────────────────────────────── */}

      {missingRequired.length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="flex gap-3 pt-5">
            <CircleAlert className="h-5 w-5 shrink-0 text-destructive" />

            <div>
              <p className="font-semibold">
                Required ingredients missing
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {missingRequired
                  .map(
                    (ingredient) =>
                      ingredient.ingredient_name
                  )
                  .join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ───────────────────────────────────────── */}
      {/* Ingredients */}
      {/* ───────────────────────────────────────── */}

      <Card>
        <CardHeader>
          <CardTitle>
            Ingredients
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={useAvailableIngredients}
          >
            Use available ingredients
          </Button>

          <div className="space-y-2">
            {ingredients.map((ingredient) => {
              const available =
                availability[ingredient.id]

              const selected =
                selectedIds.includes(
                  ingredient.id
                )

              return (
                <button
                  key={ingredient.id}
                  type="button"
                  onClick={() =>
                    toggleIngredient(
                      ingredient.id
                    )
                  }
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground"
                    }`}
                  >
                    {selected && (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {ingredient.ingredient_name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {ingredient.quantity !== null
                        ? `${ingredient.quantity} ${
                            ingredient.unit ?? ""
                          }`
                        : "Amount not specified"}

                      {" · "}

                      {ingredient.required
                        ? "Required"
                        : "Optional"}
                    </p>
                  </div>

                  <span
                    className={`text-xs ${
                      available
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {available
                      ? "Available"
                      : "Missing"}
                  </span>
                </button>
              )
            })}
          </div>

          {missingOptional.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {missingOptional.length} optional{" "}
              {missingOptional.length === 1
                ? "ingredient is"
                : "ingredients are"}{" "}
              not in your pantry.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────── */}
      {/* Cooking steps */}
      {/* ───────────────────────────────────────── */}

      {steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Cooking steps
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex gap-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {step.step_number}
                </div>

                <p className="pt-1 text-sm leading-6">
                  {step.instruction}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ───────────────────────────────────────── */}
      {/* Recipe notes */}
      {/* ───────────────────────────────────────── */}

      {recipe.notes && (
        <Card>
          <CardHeader>
            <CardTitle>
              Recipe notes
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-sm leading-6">
              {recipe.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ───────────────────────────────────────── */}
      {/* Previous cooking history */}
      {/* ───────────────────────────────────────── */}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Previous cooking
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border p-3"
              >
                <p className="text-xs text-muted-foreground">
                  {new Date(
                    item.cooked_at
                  ).toLocaleDateString()}
                </p>

                {item.rating !== null && (
                  <p className="mt-1 text-sm">
                    {"★".repeat(item.rating)}
                    {"☆".repeat(
                      5 - item.rating
                    )}
                  </p>
                )}

                {item.notes && (
                  <p className="mt-1 text-sm">
                    {item.notes}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ───────────────────────────────────────── */}
      {/* Error */}
      {/* ───────────────────────────────────────── */}

      {error && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* ───────────────────────────────────────── */}
      {/* Cook */}
      {/* ───────────────────────────────────────── */}

      <Button
        className="w-full"
        size="lg"
        onClick={saveCookingSession}
        disabled={
          saving ||
          selectedIngredients.length === 0
        }
      >
        {saving
          ? "Saving…"
          : "Cook Recipe"}
      </Button>
    </div>
  )
}