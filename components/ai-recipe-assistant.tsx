"use client"

import { useState } from "react"
import {
  ArrowLeft,
  Check,
  Sparkles,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { getGeminiSettings } from "@/components/ai-settings"

type AIIngredient = {
  name: string
  quantity: number | null
  unit: string | null
  required: boolean
}

type AIRecipe = {
  recipe_name: string
  type: "gravy" | "poriyal" | "other"
  servings: number
  description: string
  ingredients: AIIngredient[]
  steps: string[]
  notes: string
}

type Props = {
  householdId: string
  onBack: () => void
  onSaved: () => void
}

export function AIRecipeAssistant({
  householdId,
  onBack,
  onSaved,
}: Props) {
  const [description, setDescription] =
    useState("")

  const [recipe, setRecipe] =
    useState<AIRecipe | null>(null)

  const [loading, setLoading] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState("")

  async function generateRecipe() {
    setError("")
    setRecipe(null)

    if (!description.trim()) {
      setError(
        "Describe the dish first.",
      )
      return
    }

    const {
      apiKey,
      model,
    } = getGeminiSettings()

    if (!apiKey) {
      setError(
        "Add your Gemini API key in AI Settings first.",
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        "/api/ai",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "recipe",
            apiKey,
            model,
            input:
              description.trim(),
          }),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not generate the recipe.",
        )
      }

      setRecipe(data.result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate the recipe.",
      )
    } finally {
      setLoading(false)
    }
  }

  async function saveRecipe() {
    if (!recipe) return

    setError("")
    setSaving(true)

    try {
      const {
        data: savedRecipe,
        error: recipeError,
      } = await supabase
        .from("recipes")
        .insert({
          household_id: householdId,
          name: recipe.recipe_name.trim(),
          type: recipe.type,
          servings:
            Number(recipe.servings) ||
            2,
          notes:
            [
              recipe.description,
              recipe.notes,
            ]
              .filter(Boolean)
              .join("\n\n") ||
            null,
        })
        .select("id")
        .single()

      if (
        recipeError ||
        !savedRecipe
      ) {
        throw new Error(
          recipeError?.message ??
            "Could not save recipe.",
        )
      }

      const ingredientRows = []

      for (const ingredient of recipe.ingredients) {
        const cleanName =
          ingredient.name.trim()

        if (!cleanName) continue

        const {
          data: catalogueIngredient,
        } = await supabase
          .from("ingredients")
          .select("id, name")
          .ilike(
            "name",
            cleanName,
          )
          .limit(1)
          .maybeSingle()

        ingredientRows.push({
          recipe_id:
            savedRecipe.id,

          ingredient_id:
            catalogueIngredient?.id ??
            null,

          ingredient_name:
            cleanName,

          quantity:
            ingredient.quantity ===
            null
              ? null
              : Number(
                  ingredient.quantity,
                ),

          unit:
            ingredient.unit?.trim() ||
            null,

          required:
            Boolean(
              ingredient.required,
            ),
        })
      }

      if (
        ingredientRows.length >
        0
      ) {
        const {
          error:
            ingredientsError,
        } = await supabase
          .from(
            "recipe_ingredients",
          )
          .insert(ingredientRows)

        if (ingredientsError) {
          await supabase
            .from("recipes")
            .delete()
            .eq(
              "id",
              savedRecipe.id,
            )

          throw new Error(
            ingredientsError.message,
          )
        }
      }

      const stepRows =
        recipe.steps
          .map((step) =>
            step.trim(),
          )
          .filter(Boolean)
          .map(
            (
              instruction,
              index,
            ) => ({
              recipe_id:
                savedRecipe.id,

              step_number:
                index + 1,

              instruction,
            }),
          )

      if (
        stepRows.length > 0
      ) {
        const {
          error: stepsError,
        } = await supabase
          .from("recipe_steps")
          .insert(stepRows)

        if (stepsError) {
          await supabase
            .from("recipes")
            .delete()
            .eq(
              "id",
              savedRecipe.id,
            )

          throw new Error(
            stepsError.message,
          )
        }
      }

      onSaved()
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Could not save recipe.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        My Recipes
      </button>

      <div>
        <h1 className="text-2xl font-bold">
          AI Recipe Assistant
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Describe something you cooked,
          even if you don't know its name.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Describe your dish
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            placeholder="Example: I made something with brinjal, tomato, moong dal, coconut and sambar powder. I cooked the dal first and then simmered everything together."
            rows={6}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <Button
            type="button"
            className="w-full"
            onClick={generateRecipe}
            disabled={loading}
          >
            <Sparkles className="mr-2 h-4 w-4" />

            {loading
              ? "Gemini is understanding it…"
              : "Understand my dish"}
          </Button>
        </CardContent>
      </Card>

      {recipe && (
        <Card>
          <CardHeader>
            <CardTitle>
              Review AI recipe
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Check everything before saving.
              Gemini suggestions are not saved
              automatically.
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recipe name
              </p>

              <p className="mt-1 text-lg font-semibold">
                {recipe.recipe_name}
              </p>
            </div>

            <div className="flex gap-2">
              <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">
                {recipe.type}
              </span>

              <span className="rounded-full bg-muted px-3 py-1 text-xs">
                {recipe.servings} servings
              </span>
            </div>

            {recipe.description && (
              <p className="text-sm leading-6 text-muted-foreground">
                {recipe.description}
              </p>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                Ingredients
              </h3>

              <div className="space-y-2">
                {recipe.ingredients.map(
                  (
                    ingredient,
                    index,
                  ) => (
                    <div
                      key={`${ingredient.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {ingredient.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {ingredient.quantity !==
                          null
                            ? `${ingredient.quantity} ${
                                ingredient.unit ??
                                ""
                              }`
                            : "Amount not specified"}
                        </p>
                      </div>

                      <span className="text-xs text-muted-foreground">
                        {ingredient.required
                          ? "Required"
                          : "Optional"}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            {recipe.steps.length >
              0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">
                  Cooking steps
                </h3>

                {recipe.steps.map(
                  (
                    step,
                    index,
                  ) => (
                    <div
                      key={index}
                      className="flex gap-3"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {index + 1}
                      </div>

                      <p className="pt-1 text-sm leading-6">
                        {step}
                      </p>
                    </div>
                  ),
                )}
              </div>
            )}

            {recipe.notes && (
              <div>
                <h3 className="text-sm font-semibold">
                  Notes
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  {recipe.notes}
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="button"
              className="w-full"
              onClick={saveRecipe}
              disabled={saving}
            >
              <Check className="mr-2 h-4 w-4" />

              {saving
                ? "Saving recipe…"
                : "Save to My Recipes"}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && !recipe && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        AI output should be reviewed before
        cooking. Your saved recipe remains
        editable through your recipe data.
      </p>
    </div>
  )
}