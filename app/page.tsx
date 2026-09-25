"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  ChefHat,
  Home,
  Settings,
  ShoppingBasket,
} from "lucide-react"

import { AppHeader } from "@/components/app-header"
import { PantrySection } from "@/components/pantry-section"

import {
  DietaryPreferences,
  type PreferenceKey,
  type DateRestriction,
} from "@/components/dietary-preferences"

import { RecipeForm } from "@/components/recipe-form"
import { RecipeList } from "@/components/recipe-list"
import { CookingSession } from "@/components/cooking-session"

import { AISettings } from "@/components/ai-settings"
import { AIRecipeAssistant } from "@/components/ai-recipe-assistant"
import { MealPlanner } from "@/components/meal-planner"

import {
  WeeklyMealPlan,
  type WeeklyMealDay,
  type WeeklyRecipe,
} from "@/components/weekly-meal-plan"

import { supabase } from "@/lib/supabase"

const HOUSEHOLD_ID =
  "25236a71-99cc-4ced-8500-c2125123d4db"

type Preferences = Record<
  PreferenceKey,
  boolean
>

type PantryItem = {
  id: string
  name: string
  quantity: number
  unit: string
  boughtAt: string
  availableForPlanning: boolean
}

type View =
  | "week"
  | "pantry"
  | "recipes"
  | "add-recipe"
  | "ai-recipe"
  | "planner"
  | "cook"

const defaultPreferences: Preferences = {
  onion: true,
  garlic: true,
}

function getMonday(date = new Date()) {
  const value = new Date(date)
  const day = value.getDay()

  const diff =
    day === 0 ? -6 : 1 - day

  value.setDate(
    value.getDate() + diff,
  )

  value.setHours(0, 0, 0, 0)

  return value
}

function toDateString(date: Date) {
  return date
    .toISOString()
    .slice(0, 10)
}

export default function HomePage() {
  const [preferences, setPreferences] =
    useState<Preferences>(
      defaultPreferences,
    )

  const [dateRestrictions, setDateRestrictions] =
    useState<DateRestriction[]>([])

  const [pantry, setPantry] =
    useState<PantryItem[]>([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [currentView, setCurrentView] =
    useState<View>("week")

  const [selectedRecipeId, setSelectedRecipeId] =
    useState<string | null>(null)

  const [aiSettingsOpen, setAISettingsOpen] =
    useState(false)

  const [weeklyDays, setWeeklyDays] =
    useState<WeeklyMealDay[]>([])

  const [weeklyRecipes, setWeeklyRecipes] =
    useState<WeeklyRecipe[]>([])

  const [weekLoading, setWeekLoading] =
    useState(false)

  const [weekStart] = useState(() =>
    toDateString(getMonday()),
  )

  const weekDates = useMemo(() => {
    const monday = new Date(
      `${weekStart}T00:00:00`,
    )

    return Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date(monday)

        date.setDate(
          monday.getDate() + index,
        )

        return toDateString(date)
      },
    )
  }, [weekStart])

  useEffect(() => {
    void loadApp()
  }, [])

  useEffect(() => {
    if (!loading) {
      void loadWeeklyPlan()
    }
  }, [loading, weekStart])

  async function loadApp() {
    setLoading(true)

    await Promise.all([
      loadPreferences(),
      loadDateRestrictions(),
      loadPantry(),
    ])

    setLoading(false)
  }

  async function loadPreferences() {
    const {
      data,
      error,
    } = await supabase
      .from("household_preferences")
      .select(
        "onion_allowed, garlic_allowed",
      )
      .eq(
        "household_id",
        HOUSEHOLD_ID,
      )
      .maybeSingle()

    if (error) {
      console.error(
        "Could not load dietary preferences:",
        error,
      )
      return
    }

    if (data) {
      setPreferences({
        onion: Boolean(
          data.onion_allowed,
        ),
        garlic: Boolean(
          data.garlic_allowed,
        ),
      })
    }
  }

  async function loadDateRestrictions() {
    const {
      data,
      error,
    } = await supabase
      .from(
        "dietary_date_restrictions",
      )
      .select(
        "restriction_date, no_onion, no_garlic",
      )
      .eq(
        "household_id",
        HOUSEHOLD_ID,
      )
      .gte(
        "restriction_date",
        weekDates[0],
      )
      .lte(
        "restriction_date",
        weekDates[6],
      )
      .order("restriction_date", {
        ascending: true,
      })

    if (error) {
      console.error(
        "Could not load date restrictions:",
        error,
      )
      return
    }

    setDateRestrictions(
      (data ?? []).map((item) => ({
        date: item.restriction_date,
        noOnion: Boolean(
          item.no_onion,
        ),
        noGarlic: Boolean(
          item.no_garlic,
        ),
      })),
    )
  }

  async function loadPantry() {
    const {
      data,
      error,
    } = await supabase
      .from("pantry_items")
      .select(
        `
          id,
          quantity,
          unit,
          bought_at,
          available_for_planning,
          ingredients(name)
        `,
      )
      .eq(
        "household_id",
        HOUSEHOLD_ID,
      )
      .order("created_at", {
        ascending: true,
      })

    if (error) {
      console.error(
        "Could not load pantry:",
        error,
      )
      return
    }

    setPantry(
      (data ?? []).map(
        (item: any) => ({
          id: item.id,
          name:
            item.ingredients?.name ??
            "Unknown ingredient",
          quantity: Number(
            item.quantity ?? 0,
          ),
          unit:
            item.unit ?? "pcs",
          boughtAt:
            item.bought_at ??
            toDateString(new Date()),
          availableForPlanning:
            Boolean(
              item.available_for_planning,
            ),
        }),
      ),
    )
  }

  async function loadWeeklyPlan() {
    setWeekLoading(true)

    try {
      const {
        data: plan,
        error: planError,
      } = await supabase
        .from("meal_plans")
        .select(
          "id, week_start, title",
        )
        .eq(
          "household_id",
          HOUSEHOLD_ID,
        )
        .eq(
          "week_start",
          weekStart,
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle()

      if (planError) {
        console.error(
          "Could not load weekly meal plan:",
          planError,
        )
        return
      }

      if (!plan) {
        setWeeklyDays([])
        setWeeklyRecipes([])
        return
      }

      const {
        data: dayData,
        error: dayError,
      } = await supabase
        .from("meal_plan_days")
        .select(
          `
            id,
            day_date,
            gravy_recipe_id,
            poriyal_recipe_id,
            breakfast_note,
            dinner_note,
            reason,
            estimated_protein_g,
            estimated_fibre_g,
            warnings,
            actual_gravy_recipe_id,
            actual_poriyal_recipe_id,
            actual_meal_note,
            completed_at
          `,
        )
        .eq(
          "meal_plan_id",
          plan.id,
        )
        .order("day_date", {
          ascending: true,
        })

      if (dayError) {
        console.error(
          "Could not load meal plan days:",
          dayError,
        )
        return
      }

      const recipeIds =
        new Set<string>()

      for (const day of dayData ?? []) {
        if (day.gravy_recipe_id) {
          recipeIds.add(
            day.gravy_recipe_id,
          )
        }

        if (day.poriyal_recipe_id) {
          recipeIds.add(
            day.poriyal_recipe_id,
          )
        }

        if (
          day.actual_gravy_recipe_id
        ) {
          recipeIds.add(
            day.actual_gravy_recipe_id,
          )
        }

        if (
          day.actual_poriyal_recipe_id
        ) {
          recipeIds.add(
            day.actual_poriyal_recipe_id,
          )
        }
      }

      let recipeData: any[] = []

      if (recipeIds.size > 0) {
        const result =
          await supabase
            .from("recipes")
            .select(
              "id, name, type",
            )
            .in(
              "id",
              Array.from(recipeIds),
            )

        if (result.error) {
          console.error(
            "Could not load meal plan recipes:",
            result.error,
          )
        } else {
          recipeData =
            result.data ?? []
        }
      }

      const recipes: WeeklyRecipe[] =
        recipeData.map(
          (recipe) => ({
            id: recipe.id,
            name: recipe.name,
            type: recipe.type,
          }),
        )

      const recipeMap = new Map(
        recipes.map((recipe) => [
          recipe.id,
          recipe,
        ]),
      )

      const days: WeeklyMealDay[] =
        (dayData ?? []).map(
          (day: any) => ({
            id: day.id,
            dayDate:
              day.day_date,

            gravyRecipeId:
              day.gravy_recipe_id,

            poriyalRecipeId:
              day.poriyal_recipe_id,

            breakfastNote:
              day.breakfast_note ??
              null,

            dinnerNote:
              day.dinner_note ??
              null,

            reason:
              day.reason ?? null,

            estimatedProteinG:
              day.estimated_protein_g ==
              null
                ? null
                : Number(
                    day.estimated_protein_g,
                  ),

            estimatedFibreG:
              day.estimated_fibre_g ==
              null
                ? null
                : Number(
                    day.estimated_fibre_g,
                  ),

            warnings:
              day.warnings ?? [],

            actualGravyRecipeId:
              day.actual_gravy_recipe_id ??
              null,

            actualPoriyalRecipeId:
              day.actual_poriyal_recipe_id ??
              null,

            actualMealNote:
              day.actual_meal_note ??
              null,

            completedAt:
              day.completed_at ??
              null,
          }),
        )

      setWeeklyRecipes(recipes)
      setWeeklyDays(days)
    } finally {
      setWeekLoading(false)
    }
  }

  async function togglePreference(
    key: PreferenceKey,
    value: boolean,
  ) {
    const previous =
      preferences[key]

    setPreferences((current) => ({
      ...current,
      [key]: value,
    }))

    const columnMap: Record<
      PreferenceKey,
      string
    > = {
      onion: "onion_allowed",
      garlic: "garlic_allowed",
    }

    setSaving(true)

    const { error } =
      await supabase
        .from(
          "household_preferences",
        )
        .update({
          [columnMap[key]]: value,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "household_id",
          HOUSEHOLD_ID,
        )

    if (error) {
      console.error(
        "Could not save dietary preference:",
        error,
      )

      setPreferences((current) => ({
        ...current,
        [key]: previous,
      }))
    }

    setSaving(false)
  }

  async function toggleDateRestriction(
    date: string,
    key:
      | "noOnion"
      | "noGarlic",
    value: boolean,
  ) {
    const current =
      dateRestrictions.find(
        (item) =>
          item.date === date,
      ) ?? {
        date,
        noOnion: false,
        noGarlic: false,
      }

    const next: DateRestriction = {
      ...current,
      [key]: value,
    }

    setDateRestrictions(
      (items) => {
        const exists = items.some(
          (item) =>
            item.date === date,
        )

        if (exists) {
          return items.map(
            (item) =>
              item.date === date
                ? next
                : item,
          )
        }

        return [...items, next]
      },
    )

    setSaving(true)

    if (
      !next.noOnion &&
      !next.noGarlic
    ) {
      const { error } =
        await supabase
          .from(
            "dietary_date_restrictions",
          )
          .delete()
          .eq(
            "household_id",
            HOUSEHOLD_ID,
          )
          .eq(
            "restriction_date",
            date,
          )

      if (error) {
        console.error(
          "Could not remove date restriction:",
          error,
        )
      }
    } else {
      const { error } =
        await supabase
          .from(
            "dietary_date_restrictions",
          )
          .upsert(
            {
              household_id:
                HOUSEHOLD_ID,
              restriction_date:
                date,
              no_onion:
                next.noOnion,
              no_garlic:
                next.noGarlic,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "household_id,restriction_date",
            },
          )

      if (error) {
        console.error(
          "Could not save date restriction:",
          error,
        )
      }
    }

    setSaving(false)
  }

  async function addIngredient(
    name: string,
    quantity: number,
    unit: string,
    boughtAt: string,
    availableForPlanning: boolean,
  ) {
    const trimmed =
      name.trim()

    if (!trimmed) return

    const {
      data: ingredient,
      error: ingredientError,
    } = await supabase
      .from("ingredients")
      .select("id, name")
      .ilike(
        "name",
        trimmed,
      )
      .maybeSingle()

    if (ingredientError) {
      console.error(
        "Could not find ingredient:",
        ingredientError,
      )
      return
    }

    if (!ingredient) {
      alert(
        `"${trimmed}" is not in the ingredient catalogue yet.`,
      )
      return
    }

    if (
      pantry.some(
        (item) =>
          item.name.toLowerCase() ===
          ingredient.name.toLowerCase(),
      )
    ) {
      return
    }

    const {
      data,
      error,
    } = await supabase
      .from("pantry_items")
      .insert({
        household_id:
          HOUSEHOLD_ID,
        ingredient_id:
          ingredient.id,
        quantity,
        unit,
        bought_at:
          boughtAt ||
          toDateString(
            new Date(),
          ),
        available_for_planning:
          availableForPlanning,
      })
      .select(
        `
          id,
          quantity,
          unit,
          bought_at,
          available_for_planning,
          ingredients(name)
        `,
      )
      .single()

    if (error) {
      console.error(
        "Could not add pantry item:",
        error,
      )
      return
    }

    setPantry((current) => [
      ...current,
      {
        id: data.id,
        name:
          (data as any)
            .ingredients?.name ??
          ingredient.name,
        quantity: Number(
          data.quantity,
        ),
        unit: data.unit,
        boughtAt:
          data.bought_at ??
          boughtAt,
        availableForPlanning:
          Boolean(
            data.available_for_planning,
          ),
      },
    ])
  }

  async function removeIngredient(
    id: string,
  ) {
    const { error } =
      await supabase
        .from("pantry_items")
        .delete()
        .eq("id", id)
        .eq(
          "household_id",
          HOUSEHOLD_ID,
        )

    if (error) {
      console.error(
        "Could not remove pantry item:",
        error,
      )
      return
    }

    setPantry((current) =>
      current.filter(
        (item) =>
          item.id !== id,
      ),
    )
  }

  async function updatePantryItem(
    id: string,
    quantity: number,
    unit: string,
    boughtAt: string,
  ) {
    const { error } =
      await supabase
        .from("pantry_items")
        .update({
          quantity,
          unit,
          bought_at: boughtAt,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .eq(
          "household_id",
          HOUSEHOLD_ID,
        )

    if (error) {
      console.error(
        "Could not update pantry item:",
        error,
      )
      return
    }

    setPantry((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
              unit,
              boughtAt,
            }
          : item,
      ),
    )
  }

  async function togglePlanningAvailability(
    id: string,
    available: boolean,
  ) {
    const { error } =
      await supabase
        .from("pantry_items")
        .update({
          available_for_planning:
            available,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .eq(
          "household_id",
          HOUSEHOLD_ID,
        )

    if (error) {
      console.error(
        "Could not update planning availability:",
        error,
      )
      return
    }

    setPantry((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              availableForPlanning:
                available,
            }
          : item,
      ),
    )
  }

  async function markCooked(
    day: WeeklyMealDay,
  ) {
    const completedAt =
      new Date().toISOString()

    const { error } =
      await supabase
        .from("meal_plan_days")
        .update({
          completed_at:
            completedAt,
        })
        .eq("id", day.id)

    if (error) {
      console.error(
        "Could not mark day as cooked:",
        error,
      )
      return
    }

    setWeeklyDays((current) =>
      current.map((item) =>
        item.id === day.id
          ? {
              ...item,
              completedAt,
            }
          : item,
      ),
    )
  }

  async function changeActualMeal(
    day: WeeklyMealDay,
    actualGravyRecipeId: string | null,
    actualPoriyalRecipeId: string | null,
    actualMealNote: string | null,
  ) {
    const { error } =
      await supabase
        .from("meal_plan_days")
        .update({
          actual_gravy_recipe_id:
            actualGravyRecipeId,
          actual_poriyal_recipe_id:
            actualPoriyalRecipeId,
          actual_meal_note:
            actualMealNote,
        })
        .eq("id", day.id)

    if (error) {
      console.error(
        "Could not update actual meal:",
        error,
      )
      return
    }

    setWeeklyDays((current) =>
      current.map((item) =>
        item.id === day.id
          ? {
              ...item,
              actualGravyRecipeId,
              actualPoriyalRecipeId,
              actualMealNote,
            }
          : item,
      ),
    )
  }

  const planningPantry =
    useMemo(
      () =>
        pantry.filter(
          (item) =>
            item.availableForPlanning,
        ),
      [pantry],
    )

  function goWeek() {
    setCurrentView("week")
    void loadWeeklyPlan()
  }

  function goPantry() {
    setCurrentView("pantry")
  }

  function goRecipes() {
    setCurrentView("recipes")
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          Loading Meal Planner…
        </p>
      </main>
    )
  }

  if (
    currentView === "cook" &&
    selectedRecipeId
  ) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24">
        <div className="pt-4">
          <CookingSession
            recipeId={
              selectedRecipeId
            }
            householdId={
              HOUSEHOLD_ID
            }
            pantry={pantry}
            onBack={() => {
              setSelectedRecipeId(
                null,
              )
              goRecipes()
            }}
            onFinished={() => {
              setSelectedRecipeId(
                null,
              )
              goRecipes()
            }}
          />
        </div>
      </main>
    )
  }

  if (
    currentView ===
    "add-recipe"
  ) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24">
        <div className="pt-4">
          <RecipeForm
            userId=""
            householdId={
              HOUSEHOLD_ID
            }
            onCancel={
              goRecipes
            }
            onSaved={
              goRecipes
            }
          />
        </div>
      </main>
    )
  }

  if (
    currentView ===
    "ai-recipe"
  ) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24">
        <div className="pt-4">
          <AIRecipeAssistant
            householdId={
              HOUSEHOLD_ID
            }
            onBack={
              goRecipes
            }
            onSaved={
              goRecipes
            }
          />
        </div>
      </main>
    )
  }

  if (
    currentView ===
    "planner"
  ) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24">
        <div className="pt-4">
          <MealPlanner
            householdId={
              HOUSEHOLD_ID
            }
            pantry={
              planningPantry
            }
            preferences={
              preferences
            }
            dateRestrictions={
              dateRestrictions
            }
            onBack={
              goWeek
            }
            onSaved={
              goWeek
            }
          />
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24">
      <div className="flex flex-col gap-5 pt-4">
        <AppHeader />

        {/* THIS WEEK */}
        {currentView ===
          "week" && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  This week
                </p>

                <h1 className="text-2xl font-bold tracking-tight">
                  Meal Plan
                </h1>
              </div>

              <button
                type="button"
                onClick={() =>
                  setAISettingsOpen(
                    true,
                  )
                }
                className="flex size-10 items-center justify-center rounded-full border border-border bg-background"
                aria-label="Gemini AI settings"
              >
                <Settings className="size-5" />
              </button>
            </div>

            <DietaryPreferences
              preferences={
                preferences
              }
              onToggle={
                togglePreference
              }
              dateRestrictions={
                dateRestrictions
              }
              onToggleDateRestriction={
                toggleDateRestriction
              }
            />

            {saving && (
              <p className="text-center text-xs text-muted-foreground">
                Saving…
              </p>
            )}

            <WeeklyMealPlan
              weekStart={
                weekStart
              }
              days={
                weeklyDays
              }
              recipes={
                weeklyRecipes
              }
              loading={
                weekLoading
              }
              onGenerate={() =>
                setCurrentView(
                  "planner",
                )
              }
              onMarkCooked={
                markCooked
              }
              onChangeMeal={
                changeActualMeal
              }
            />

            {weeklyDays.length >
              0 && (
              <button
                type="button"
                onClick={() =>
                  setCurrentView(
                    "planner",
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold"
              >
                <CalendarDays className="size-4" />
                Generate / Update This Week
              </button>
            )}
          </>
        )}

        {/* PANTRY */}
        {currentView ===
          "pantry" && (
          <>
            <div>
              <p className="text-sm text-muted-foreground">
                Ingredients available at home
              </p>

              <h1 className="text-2xl font-bold tracking-tight">
                Pantry
              </h1>
            </div>

            <PantrySection
              items={pantry}
              onAdd={
                addIngredient
              }
              onRemove={
                removeIngredient
              }
              onUpdate={
                updatePantryItem
              }
              onTogglePlanning={
                togglePlanningAvailability
              }
            />
          </>
        )}

        {/* RECIPES */}
        {currentView ===
          "recipes" && (
          <>
            <div>
              <p className="text-sm text-muted-foreground">
                Your saved dishes
              </p>

              <h1 className="text-2xl font-bold tracking-tight">
                Recipes
              </h1>
            </div>

            <RecipeList
              householdId={
                HOUSEHOLD_ID
              }
              onAddRecipe={() =>
                setCurrentView(
                  "add-recipe",
                )
              }
              onAddAIRecipe={() =>
                setCurrentView(
                  "ai-recipe",
                )
              }
              onCookRecipe={(
                recipeId,
              ) => {
                setSelectedRecipeId(
                  recipeId,
                )
                setCurrentView(
                  "cook",
                )
              }}
            />
          </>
        )}
      </div>

      {/* Bottom navigation */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md border-t border-border bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
      >
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={
              goWeek
            }
            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium ${
              currentView ===
              "week"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Home className="size-5" />
            Week
          </button>

          <button
            type="button"
            onClick={
              goPantry
            }
            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium ${
              currentView ===
              "pantry"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <ShoppingBasket className="size-5" />
            Pantry
          </button>

          <button
            type="button"
            onClick={
              goRecipes
            }
            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium ${
              currentView ===
              "recipes"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <ChefHat className="size-5" />
            Recipes
          </button>
        </div>
      </nav>

      {aiSettingsOpen && (
        <AISettings
          open={
            aiSettingsOpen
          }
          onClose={() =>
            setAISettingsOpen(
              false,
            )
          }
        />
      )}
    </main>
  )
}