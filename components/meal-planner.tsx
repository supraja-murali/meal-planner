"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Sparkles,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  getGeminiSettings,
} from "@/components/ai-settings"

type PantryItem = {
  id: string
  name: string
  quantity: number
  unit: string
}

type Preferences = {
  onion: boolean
  garlic: boolean
}

type Recipe = {
  id: string
  name: string
  type: "gravy" | "poriyal" | "other"
  servings: number
  favourite: boolean
}

type RecipeIngredient = {
  recipe_id: string
  ingredient_name: string
  required: boolean
}

type HistoryItem = {
  recipe_id: string
  cooked_at: string
  rating: number | null
}

type PlanDay = {
  date: string
  gravy_recipe_id: string | null
  poriyal_recipe_id: string | null
  breakfast_note: string
  dinner_note: string
  reason: string
  estimated_protein_g: number
  estimated_fibre_g: number
  warnings: string[]
}

type GeneratedPlan = {
  summary: string
  days: PlanDay[]
}

type DateRestriction = {
  date: string
  noOnion: boolean
  noGarlic: boolean
}

type Props = {
  householdId: string
  pantry: PantryItem[]
  preferences: Preferences
  dateRestrictions: DateRestriction[]
  onBack: () => void
  onSaved: () => void
}

function getMonday(
  date: Date,
) {
  const result = new Date(date)
  const day =
    result.getDay()

  const diff =
    day === 0
      ? -6
      : 1 - day

  result.setDate(
    result.getDate() + diff,
  )

  return result
}

function toISODate(
  date: Date,
) {
  return date
    .toISOString()
    .slice(0, 10)
}

function addDays(
  date: Date,
  amount: number,
) {
  const result =
    new Date(date)

  result.setDate(
    result.getDate() + amount,
  )

  return result
}

function normalize(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " ",
    )
}

export function MealPlanner({
  householdId,
  pantry,
  preferences,
  onBack,
  onSaved,
}: Props) {
  const [
    recipes,
    setRecipes,
  ] = useState<Recipe[]>([])

  const [
    recipeIngredients,
    setRecipeIngredients,
  ] = useState<
    RecipeIngredient[]
  >([])

  const [
    history,
    setHistory,
  ] = useState<HistoryItem[]>([])

  const [
    nutrition,
    setNutrition,
  ] = useState({
    householdSize: 2,
    proteinMin: 90,
    proteinMax: 100,
    fibreMin: 30,
  })

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    generating,
    setGenerating,
  ] = useState(false)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    plan,
    setPlan,
  ] = useState<GeneratedPlan | null>(
    null,
  )

  const [
    error,
    setError,
  ] = useState("")

  const monday = useMemo(
    () =>
      getMonday(
        new Date(),
      ),
    [],
  )

  useEffect(() => {
    loadPlannerData()
  }, [householdId])

  async function loadPlannerData() {
    setLoading(true)
    setError("")

    const [
      recipesResult,
      ingredientsResult,
      historyResult,
      preferencesResult,
    ] = await Promise.all([
      supabase
        .from("recipes")
        .select(
          "id, name, type, servings, favourite",
        )
        .eq(
          "household_id",
          householdId,
        )
        .order(
          "name",
          {
            ascending: true,
          },
        ),

      supabase
        .from(
          "recipe_ingredients",
        )
        .select(
          "recipe_id, ingredient_name, required",
        ),

      supabase
        .from("meal_history")
        .select(
          "recipe_id, cooked_at, rating",
        )
        .eq(
          "household_id",
          householdId,
        )
        .order(
          "cooked_at",
          {
            ascending: false,
          },
        )
        .limit(100),

      supabase
        .from(
          "household_preferences",
        )
        .select(
          "household_size, protein_min, protein_max, fibre_min",
        )
        .eq(
          "household_id",
          householdId,
        )
        .single(),
    ])

    if (
      recipesResult.error
    ) {
      console.error(
        recipesResult.error,
      )
    }

    setRecipes(
      (recipesResult.data ??
        []) as Recipe[],
    )

    setRecipeIngredients(
      (ingredientsResult.data ??
        []) as RecipeIngredient[],
    )

    setHistory(
      (historyResult.data ??
        []) as HistoryItem[],
    )

    if (
      !preferencesResult.error &&
      preferencesResult.data
    ) {
      setNutrition({
        householdSize:
          Number(
            preferencesResult
              .data
              .household_size,
          ) || 2,

        proteinMin:
          Number(
            preferencesResult
              .data
              .protein_min,
          ) || 90,

        proteinMax:
          Number(
            preferencesResult
              .data
              .protein_max,
          ) || 100,

        fibreMin:
          Number(
            preferencesResult
              .data
              .fibre_min,
          ) || 30,
      })
    }

    setLoading(false)
  }

  const gravyRecipes =
    recipes.filter(
      (recipe) =>
        recipe.type === "gravy",
    )

  const poriyalRecipes =
    recipes.filter(
      (recipe) =>
        recipe.type ===
        "poriyal",
    )

  function getRecipeFrequency(
    recipeId: string,
  ) {
    return history.filter(
      (item) =>
        item.recipe_id ===
        recipeId,
    ).length
  }

  function getRecipeRating(
    recipeId: string,
  ) {
    const ratings =
      history
        .filter(
          (item) =>
            item.recipe_id ===
              recipeId &&
            item.rating !==
              null,
        )
        .map(
          (item) =>
            item.rating as number,
        )

    if (!ratings.length) {
      return null
    }

    return (
      ratings.reduce(
        (sum, value) =>
          sum + value,
        0,
      ) / ratings.length
    )
  }

  function getPantryMatches(
    recipeId: string,
  ) {
    const ingredients =
      recipeIngredients.filter(
        (item) =>
          item.recipe_id ===
          recipeId,
      )

    return ingredients.filter(
      (ingredient) =>
        pantry.some(
          (item) =>
            normalize(
              item.name,
            ) ===
            normalize(
              ingredient.ingredient_name,
            ),
        ),
    ).length
  }

  function buildRecipeContext(
    recipeList: Recipe[],
  ) {
    return recipeList.map(
      (recipe) => ({
        id: recipe.id,
        name: recipe.name,
        type: recipe.type,
        servings:
          recipe.servings,
        favourite:
          recipe.favourite,

        cooking_count:
          getRecipeFrequency(
            recipe.id,
          ),

        average_rating:
          getRecipeRating(
            recipe.id,
          ),

        pantry_ingredient_matches:
          getPantryMatches(
            recipe.id,
          ),

        ingredients:
          recipeIngredients
            .filter(
              (item) =>
                item.recipe_id ===
                recipe.id,
            )
            .map(
              (item) => ({
                name:
                  item.ingredient_name,
                required:
                  item.required,
              }),
            ),
      }),
    )
  }

  async function generatePlan() {
    setError("")
    setPlan(null)

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

    if (
      gravyRecipes.length ===
      0
    ) {
      setError(
        "Add at least one gravy recipe before generating a meal plan.",
      )
      return
    }

    if (
      poriyalRecipes.length ===
      0
    ) {
      setError(
        "Add at least one poriyal recipe before generating a meal plan.",
      )
      return
    }

    setGenerating(true)

    const days =
      Array.from(
        { length: 7 },
        (_, index) =>
          toISODate(
            addDays(
              monday,
              index,
            ),
          ),
      )

    const context = {
      week_start:
        days[0],

      dates: days,

      household: {
        size:
          nutrition.householdSize,

        protein_target_g_per_person:
          {
            min:
              nutrition.proteinMin,
            max:
              nutrition.proteinMax,
          },

        fibre_target_g_per_person:
          nutrition.fibreMin,

        dietary_preferences:
          preferences,

        vegetarian: true,
        eggs: false,
        meat: false,
      },

      cooking_structure: {
        gravy_per_day: 1,
        poriyal_per_day: 1,
        breakfast_uses_gravy: true,
        dinner_uses_gravy: true,
      },

      protein_combination_rule:
        "Do not combine a major legume-based dish with a tofu/soy-based dish on the same day. Paneer is not included in this restriction.",

      pantry:
        pantry.map(
          (item) => ({
            name: item.name,
            quantity:
              item.quantity,
            unit: item.unit,
          }),
        ),

      recipes: buildRecipeContext(
        recipes,
      ),

      recent_cooking_history:
        history.map(
          (item) => ({
            recipe_id:
              item.recipe_id,
            cooked_at:
              item.cooked_at,
            rating:
              item.rating,
          }),
        ),
    }

    try {
      const response =
        await fetch(
          "/api/ai",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "planner",
              apiKey,
              model,
              context,
            }),
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not generate the meal plan.",
        )
      }

      const generated =
        data.result as GeneratedPlan

      const validRecipeIds =
        new Set(
          recipes.map(
            (recipe) =>
              recipe.id,
          ),
        )

      const cleanedDays =
        generated.days
          .filter(
            (day) =>
              days.includes(
                day.date,
              ),
          )
          .map((day) => ({
            ...day,

            gravy_recipe_id:
              day.gravy_recipe_id &&
              validRecipeIds.has(
                day.gravy_recipe_id,
              )
                ? day.gravy_recipe_id
                : null,

            poriyal_recipe_id:
              day.poriyal_recipe_id &&
              validRecipeIds.has(
                day.poriyal_recipe_id,
              )
                ? day.poriyal_recipe_id
                : null,
          }))

      if (
        cleanedDays.length !==
        7
      ) {
        throw new Error(
          "Gemini did not return a complete seven-day plan. Please try again.",
        )
      }

      setPlan({
        summary:
          generated.summary,
        days: cleanedDays,
      })
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Could not generate the meal plan.",
      )
    } finally {
      setGenerating(false)
    }
  }

  function getRecipeName(
    recipeId: string | null,
  ) {
    if (!recipeId) {
      return "Not selected"
    }

    return (
      recipes.find(
        (recipe) =>
          recipe.id ===
          recipeId,
      )?.name ??
      "Unknown recipe"
    )
  }

  async function savePlan() {
    if (!plan) return

    setError("")
    setSaving(true)

    try {
      const {
        data: savedPlan,
        error: planError,
      } = await supabase
        .from("meal_plans")
        .insert({
          household_id:
            householdId,

          week_start:
            toISODate(monday),

          title:
            "AI Meal Plan",
        })
        .select("id")
        .single()

      if (
        planError ||
        !savedPlan
      ) {
        throw new Error(
          planError?.message ??
            "Could not save meal plan.",
        )
      }

      const dayRows =
        plan.days.map(
          (day) => ({
            meal_plan_id:
              savedPlan.id,

            day_date:
              day.date,

            gravy_recipe_id:
              day.gravy_recipe_id,

            poriyal_recipe_id:
              day.poriyal_recipe_id,

            breakfast_note:
              day.breakfast_note,

            dinner_note:
              day.dinner_note,

            reason:
              day.reason,

            estimated_protein_g:
              day.estimated_protein_g,

            estimated_fibre_g:
              day.estimated_fibre_g,

            warnings:
              day.warnings ?? [],
          }),
        )

      const {
        error: daysError,
      } = await supabase
        .from(
          "meal_plan_days",
        )
        .insert(dayRows)

      if (daysError) {
        await supabase
          .from("meal_plans")
          .delete()
          .eq(
            "id",
            savedPlan.id,
          )

        throw new Error(
          daysError.message,
        )
      }

      onSaved()
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Could not save meal plan.",
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Loading your recipes and
          cooking history…
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </button>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <CalendarDays className="h-6 w-6" />
          AI Meal Planner
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Gemini uses your pantry, recipes,
          preferences and cooking history to
          propose your next week.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium">
              This week
            </p>

            <p className="mt-1 text-muted-foreground">
              {toISODate(
                monday,
              )}{" "}
              →{" "}
              {toISODate(
                addDays(
                  monday,
                  6,
                ),
              )}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border p-2">
              <p className="font-semibold">
                {gravyRecipes.length}
              </p>
              <p className="text-muted-foreground">
                gravies
              </p>
            </div>

            <div className="rounded-lg border p-2">
              <p className="font-semibold">
                {poriyalRecipes.length}
              </p>
              <p className="text-muted-foreground">
                poriyals
              </p>
            </div>

            <div className="rounded-lg border p-2">
              <p className="font-semibold">
                {history.length}
              </p>
              <p className="text-muted-foreground">
                history records
              </p>
            </div>
          </div>

          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={generatePlan}
            disabled={generating}
          >
            <Sparkles className="mr-2 h-4 w-4" />

            {generating
              ? "Gemini is planning…"
              : "Generate my week"}
          </Button>
        </CardContent>
      </Card>

      {plan && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Proposed plan
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                {plan.summary}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {plan.days.map(
              (day) => (
                <Card
                  key={day.date}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {new Date(
                        `${day.date}T12:00:00`,
                      ).toLocaleDateString(
                        undefined,
                        {
                          weekday:
                            "long",
                          day: "numeric",
                          month:
                            "short",
                        },
                      )}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Gravy
                      </p>

                      <p className="mt-1 font-medium">
                        {getRecipeName(
                          day.gravy_recipe_id,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Poriyal
                      </p>

                      <p className="mt-1 font-medium">
                        {getRecipeName(
                          day.poriyal_recipe_id,
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <p>
                        <strong>
                          Breakfast:
                        </strong>{" "}
                        {day.breakfast_note}
                      </p>

                      <p className="mt-2">
                        <strong>
                          Dinner:
                        </strong>{" "}
                        {day.dinner_note}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border p-2">
                        <p className="font-semibold">
                          ~
                          {Math.round(
                            day.estimated_protein_g,
                          )}
                          g
                        </p>

                        <p className="text-muted-foreground">
                          protein/person
                        </p>
                      </div>

                      <div className="rounded-lg border p-2">
                        <p className="font-semibold">
                          ~
                          {Math.round(
                            day.estimated_fibre_g,
                          )}
                          g
                        </p>

                        <p className="text-muted-foreground">
                          fibre/person
                        </p>
                      </div>
                    </div>

                    <p className="text-xs leading-5 text-muted-foreground">
                      {day.reason}
                    </p>

                    {day.warnings?.length >
                      0 && (
                      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                        <p className="text-xs font-semibold">
                          Notes
                        </p>

                        <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                          {day.warnings.map(
                            (
                              warning,
                              index,
                            ) => (
                              <li
                                key={
                                  index
                                }
                              >
                                {
                                  warning
                                }
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ),
            )}
          </div>

          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={savePlan}
            disabled={saving}
          >
            <Check className="mr-2 h-4 w-4" />

            {saving
              ? "Saving plan…"
              : "Save this meal plan"}
          </Button>
        </>
      )}

      {error && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Nutrition values are estimates because
        your recipe database does not yet contain
        verified nutrition data.
      </p>
    </div>
  )
}