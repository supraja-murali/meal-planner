"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChefHat,
  Home,
  Settings,
  ShoppingBasket,
} from "lucide-react"

import { AppHeader } from "@/components/app-header"
import { PantrySection } from "@/components/pantry-section"
import { RecipeForm } from "@/components/recipe-form"
import { RecipeList } from "@/components/recipe-list"
import { CookingSession } from "@/components/cooking-session"
import { AISettings } from "@/components/ai-settings"
import { AIRecipeAssistant } from "@/components/ai-recipe-assistant"
import {
  MealPlanner,
  type DateRestriction,
  type PantryItem,
  type WeeklyMealDay,
  type WeeklyRecipe,
} from "@/components/meal-planner"

import { supabase } from "@/lib/supabase"

const HOUSEHOLD_ID =
  "25236a71-99cc-4ced-8500-c2125123d4db"

type View =
  | "week"
  | "pantry"
  | "recipes"
  | "add-recipe"
  | "ai-recipe"
  | "cook"

function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function addDays(dateString: string, amount: number) {
  const date = parseLocalDate(dateString)
  date.setDate(date.getDate() + amount)
  return toDateString(date)
}

function getMonday(date = new Date()) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  const day = value.getDay()
  const diff = day === 0 ? -6 : 1 - day
  value.setDate(value.getDate() + diff)
  return value
}

function normalizeWeekStart(dateString: string) {
  const date = parseLocalDate(dateString)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return toDateString(date)
}

function getWeekDates(weekStart: string) {
  const monday = normalizeWeekStart(weekStart)
  return Array.from({ length: 7 }, (_, index) =>
    addDays(monday, index),
  )
}

export default function HomePage() {
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

  const [generating, setGenerating] =
    useState(false)

  const [weekStart, setWeekStart] =
    useState(() =>
      toDateString(getMonday()),
    )

  const weekDates = useMemo(
    () => getWeekDates(weekStart),
    [weekStart],
  )

  useEffect(() => {
    void loadApp()
  }, [])

  useEffect(() => {
    if (!loading) {
      void loadDateRestrictions()
      void loadWeeklyPlan()
    }
  }, [weekStart, loading])

  async function loadApp() {
    setLoading(true)

    await Promise.all([
      loadDateRestrictions(),
      loadPantry(),
      loadWeeklyPlan(),
    ])

    setLoading(false)
  }

  async function loadDateRestrictions() {
    const dates = getWeekDates(weekStart)

    const {
      data,
      error,
    } = await supabase
      .from(
        "dietary_date_restrictions",
      )
      .select(
        "restriction_date, no_onion, no_garlic, additional_restrictions",
      )
      .eq(
        "household_id",
        HOUSEHOLD_ID,
      )
      .gte(
        "restriction_date",
        dates[0],
      )
      .lte(
        "restriction_date",
        dates[6],
      )
      .order(
        "restriction_date",
        {
          ascending: true,
        },
      )

    if (error) {
      console.error(
        "Could not load date restrictions:",
        error,
      )
      return
    }

    setDateRestrictions(
      (data ?? []).map(
        (item) => ({
          date:
            item.restriction_date,
          noOnion: Boolean(
            item.no_onion,
          ),
          noGarlic: Boolean(
            item.no_garlic,
          ),
          additionalRestrictions:
            item.additional_restrictions ?? "",
        }),
      ),
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
      .order(
        "created_at",
        {
          ascending: true,
        },
      )

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
            toDateString(
              new Date(),
            ),
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
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
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
        .order(
          "day_date",
          {
            ascending: true,
          },
        )

      if (dayError) {
        console.error(
          "Could not load meal plan days:",
          dayError,
        )
        return
      }

      // A meal plan is valid only when it contains exactly the
      // current Monday-to-Sunday dates. Never display a stale or
      // incorrectly dated plan in another week's view.
      const expectedDates = getWeekDates(weekStart)
      const loadedDates = (dayData ?? [])
        .map((day: any) => day.day_date)
        .sort()
      const expectedSorted = [...expectedDates].sort()
      const isExactWeek =
        loadedDates.length === 7 &&
        loadedDates.every(
          (date: string, index: number) =>
            date === expectedSorted[index],
        )

      if (!isExactWeek) {
        console.warn(
          "Ignoring an incomplete or incorrectly dated meal plan.",
          { expectedDates, loadedDates },
        )
        setWeeklyDays([])
        setWeeklyRecipes([])
        return
      }

      const recipeIds =
        new Set<string>()

      for (
        const day of
          dayData ?? []
      ) {
        if (
          day.gravy_recipe_id
        ) {
          recipeIds.add(
            day.gravy_recipe_id,
          )
        }

        if (
          day.poriyal_recipe_id
        ) {
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
              Array.from(
                recipeIds,
              ),
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

      setWeeklyRecipes(recipes)

      const days: WeeklyMealDay[] =
        (dayData ?? []).map(
          (day: any) => ({
            id: day.id,

            dayDate:
              day.day_date,

            gravyRecipeId:
              day.gravy_recipe_id ??
              null,

            poriyalRecipeId:
              day.poriyal_recipe_id ??
              null,

            breakfastNote:
              day.breakfast_note ??
              null,

            dinnerNote:
              day.dinner_note ??
              null,

            reason:
              day.reason ??
              null,

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

      setWeeklyDays(days)
    } finally {
      setWeekLoading(false)
    }
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
        additionalRestrictions: "",
      }

    const next: DateRestriction =
      {
        ...current,
        [key]: value,
      }

    setDateRestrictions(
      (items) => {
        const exists =
          items.some(
            (item) =>
              item.date === date,
          )

        if (exists) {
          return items.map(
            (item) =>
              item.date ===
              date
                ? next
                : item,
          )
        }

        return [
          ...items,
          next,
        ]
      },
    )

    setSaving(true)

    if (
      !next.noOnion &&
      !next.noGarlic &&
      !next.additionalRestrictions.trim()
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
              additional_restrictions:
                next.additionalRestrictions ?? "",
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

  async function changeAdditionalRestriction(
    date: string,
    value: string,
  ) {
    const current =
      dateRestrictions.find((item) => item.date === date) ?? {
        date,
        noOnion: false,
        noGarlic: false,
        additionalRestrictions: "",
      }

    const next: DateRestriction = {
      ...current,
      additionalRestrictions: value,
    }

    setDateRestrictions((items) => {
      const exists = items.some((item) => item.date === date)
      return exists
        ? items.map((item) => (item.date === date ? next : item))
        : [...items, next]
    })

    setSaving(true)

    if (!next.noOnion && !next.noGarlic && !value.trim()) {
      const { error } = await supabase
        .from("dietary_date_restrictions")
        .delete()
        .eq("household_id", HOUSEHOLD_ID)
        .eq("restriction_date", date)

      if (error) {
        console.error("Could not remove date restriction:", error)
      }
    } else {
      const { error } = await supabase
        .from("dietary_date_restrictions")
        .upsert(
          {
            household_id: HOUSEHOLD_ID,
            restriction_date: date,
            no_onion: next.noOnion,
            no_garlic: next.noGarlic,
            additional_restrictions: value.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "household_id,restriction_date" },
        )

      if (error) {
        console.error("Could not save date restriction:", error)
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

    if (!trimmed) {
      return
    }

    const {
      data: ingredient,
      error: ingredientError,
    } = await supabase
      .from("ingredients")
      .select(
        "id, name",
      )
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

    const duplicate =
      pantry.some(
        (item) =>
          item.name.toLowerCase() ===
          ingredient.name.toLowerCase(),
      )

    if (duplicate) {
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

    setPantry(
      (current) => [
        ...current,
        {
          id: data.id,
          name:
            (data as any)
              .ingredients
              ?.name ??
            ingredient.name,
          quantity:
            Number(
              data.quantity,
            ),
          unit:
            data.unit,
          boughtAt:
            data.bought_at ??
            boughtAt,
          availableForPlanning:
            Boolean(
              data.available_for_planning,
            ),
        },
      ],
    )
  }

  async function removeIngredient(
    id: string,
  ) {
    const { error } =
      await supabase
        .from(
          "pantry_items",
        )
        .delete()
        .eq(
          "id",
          id,
        )
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

    setPantry(
      (current) =>
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
        .from(
          "pantry_items",
        )
        .update({
          quantity,
          unit,
          bought_at:
            boughtAt,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          id,
        )
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

    setPantry(
      (current) =>
        current.map(
          (item) =>
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
        .from(
          "pantry_items",
        )
        .update({
          available_for_planning:
            available,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          id,
        )
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

    setPantry(
      (current) =>
        current.map(
          (item) =>
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
        .from(
          "meal_plan_days",
        )
        .update({
          completed_at:
            completedAt,
        })
        .eq(
          "id",
          day.id,
        )

    if (error) {
      console.error(
        "Could not mark day as cooked:",
        error,
      )
      return
    }

    setWeeklyDays(
      (current) =>
        current.map(
          (item) =>
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
    actualGravyRecipeId:
      | string
      | null,
    actualPoriyalRecipeId:
      | string
      | null,
    actualMealNote:
      | string
      | null,
  ) {
    const { error } =
      await supabase
        .from(
          "meal_plan_days",
        )
        .update({
          actual_gravy_recipe_id:
            actualGravyRecipeId,
          actual_poriyal_recipe_id:
            actualPoriyalRecipeId,
          actual_meal_note:
            actualMealNote,
        })
        .eq(
          "id",
          day.id,
        )

    if (error) {
      console.error(
        "Could not update actual meal:",
        error,
      )
      return
    }

    setWeeklyDays(
      (current) =>
        current.map(
          (item) =>
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

  async function getGeminiSettings() {
    const apiKey =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(
            "meal-planner-gemini-api-key",
          )
        : null

    const model =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(
            "meal-planner-gemini-model",
          ) ?? "gemini-3.8-flash"
        : "gemini-3.8-flash"

    if (!apiKey) {
      throw new Error(
        "Add your Gemini API key in Gemini AI settings before generating a meal plan.",
      )
    }

    return { apiKey, model }
  }

  async function callPlannerAI(
    action: "planner" | "planner-day",
    context: Record<string, unknown>,
  ) {
    const { apiKey, model } =
      await getGeminiSettings()

    const prompt = JSON.stringify(
      context,
      null,
      2,
    )

    const response = await fetch(
      "/api/ai",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          apiKey,
          model,
          prompt,
          input: prompt,
          context,
        }),
      },
    )

    const payload = await response.json()

    if (!response.ok) {
      throw new Error(
        payload?.error ??
          "Gemini meal planning failed.",
      )
    }

    let result =
      payload?.data ??
      payload?.result ??
      payload?.output ??
      payload

    if (
      typeof result === "string"
    ) {
      try {
        result = JSON.parse(result)
      } catch {
        throw new Error(
          "Gemini returned an invalid meal plan.",
        )
      }
    }

    if (
      result?.text &&
      typeof result.text === "string"
    ) {
      try {
        result = JSON.parse(result.text)
      } catch {
        // Keep the original result when text is not JSON.
      }
    }

    return result
  }

  async function loadPlannerAIContext() {
    const { data: recipeData, error: recipeError } =
      await supabase
        .from("recipes")
        .select(
          "id, name, type, description, servings, notes",
        )
        .eq(
          "household_id",
          HOUSEHOLD_ID,
        )
        .order(
          "name",
          { ascending: true },
        )

    if (recipeError) {
      throw recipeError
    }

    const recipeIds =
      (recipeData ?? []).map(
        (recipe) => recipe.id,
      )

    let ingredientData: any[] = []

    if (recipeIds.length > 0) {
      const {
        data,
        error,
      } = await supabase
        .from("recipe_ingredients")
        .select(
          "recipe_id, ingredient_name, quantity, unit, required",
        )
        .in(
          "recipe_id",
          recipeIds,
        )

      if (error) {
        throw error
      }

      ingredientData = data ?? []
    }

    const {
      data: historyData,
      error: historyError,
    } = await supabase
      .from("meal_history")
      .select(
        "recipe_id, cooked_at, rating, notes",
      )
      .eq(
        "household_id",
        HOUSEHOLD_ID,
      )
      .order(
        "cooked_at",
        { ascending: false },
      )
      .limit(100)

    if (historyError) {
      throw historyError
    }

    const ingredientsByRecipe =
      new Map<string, unknown[]>()

    for (
      const ingredient of ingredientData
    ) {
      const current =
        ingredientsByRecipe.get(
          ingredient.recipe_id,
        ) ?? []

      current.push({
        name: ingredient.ingredient_name,
        quantity:
          ingredient.quantity,
        unit: ingredient.unit,
        required:
          ingredient.required,
      })

      ingredientsByRecipe.set(
        ingredient.recipe_id,
        current,
      )
    }

    const recipeNameById =
      new Map(
        (recipeData ?? []).map(
          (recipe) => [
            recipe.id,
            recipe.name,
          ],
        ),
      )

    const history =
      (historyData ?? []).map(
        (item) => ({
          recipe_id:
            item.recipe_id,
          recipe_name:
            recipeNameById.get(
              item.recipe_id,
            ) ?? null,
          cooked_at:
            item.cooked_at,
          rating:
            item.rating,
          notes:
            item.notes,
        }),
      )

    return {
      week_start: weekStart,
      dates: weekDates,
      date_restrictions:
        weekDates.map((date) => {
          const restriction =
            dateRestrictions.find(
              (item) =>
                item.date === date,
            )

          return {
            date,
            no_onion:
              restriction?.noOnion ??
              false,
            no_garlic:
              restriction?.noGarlic ??
              false,
            additional_restrictions:
              restriction?.additionalRestrictions ?? "",
          }
        }),
      pantry: pantry.map(
        (item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          available_for_planning:
            item.availableForPlanning,
        }),
      ),
      recipes: (recipeData ?? []).map(
        (recipe) => ({
          id: recipe.id,
          name: recipe.name,
          type: recipe.type,
          description:
            recipe.description,
          servings:
            recipe.servings,
          notes: recipe.notes,
          ingredients:
            ingredientsByRecipe.get(
              recipe.id,
            ) ?? [],
        }),
      ),
      meal_history: history,
      planning_rules: {
        vegetarian: true,
        eggs: false,
        meat: false,
        days_per_week: 7,
        gravy_per_day: 1,
        poriyal_per_day: 1,
        protein_target_g_per_person: {
          min: 90,
          max: 100,
        },
        fibre_target_g_per_person: 30,
        no_global_onion_preference: true,
        no_global_garlic_preference: true,
        date_restrictions_only: true,
        max_consecutive_days_using_onion: 2,
        max_consecutive_days_using_garlic: 2,
        legume_and_tofu_same_day: false,
        legume_and_soy_same_day: false,
        use_saved_recipes_when_possible: true,
        prefer_pantry_ingredients: true,
      },
    }
  }

  function getGeneratedDays(result: any) {
    const candidate =
      result?.days ??
      result?.meal_plan ??
      result?.plan?.days ??
      result?.plan ??
      []

    return Array.isArray(candidate)
      ? candidate
      : []
  }

  function resolveRecipeId(
    value: unknown,
    recipes: Array<{
      id: string
      name: string
      type: string
    }>,
    expectedType:
      | "gravy"
      | "poriyal",
  ) {
    if (
      typeof value !== "string"
    ) {
      return null
    }

    const byId =
      recipes.find(
        (recipe) =>
          recipe.id === value &&
          recipe.type === expectedType,
      )

    if (byId) {
      return byId.id
    }

    const normalized =
      value.trim().toLowerCase()

    const byName =
      recipes.find(
        (recipe) =>
          recipe.type ===
            expectedType &&
          recipe.name
            .trim()
            .toLowerCase() ===
            normalized,
      )

    return byName?.id ?? null
  }

  function getDayRecipeValue(
    day: any,
    type: "gravy" | "poriyal",
  ) {
    if (type === "gravy") {
      return (
        day?.gravy_recipe_id ??
        day?.gravyRecipeId ??
        day?.gravy_recipe ??
        day?.gravyRecipe ??
        day?.gravy_recipe_name ??
        day?.gravyRecipeName ??
        null
      )
    }

    return (
      day?.poriyal_recipe_id ??
      day?.poriyalRecipeId ??
      day?.poriyal_recipe ??
      day?.poriyalRecipe ??
      day?.poriyal_recipe_name ??
      day?.poriyalRecipeName ??
      null
    )
  }

  async function saveGeneratedWeek(
    generatedDays: any[],
  ) {
    if (
      generatedDays.length !== 7
    ) {
      throw new Error(
        "Gemini did not return a complete 7-day meal plan.",
      )
    }

    const {
      data: recipeData,
      error: recipeError,
    } = await supabase
      .from("recipes")
      .select("id, name, type")
      .eq(
        "household_id",
        HOUSEHOLD_ID,
      )

    if (recipeError) {
      throw recipeError
    }

    const recipeCatalog =
      recipeData ?? []

    const generatedByDate =
      new Map<string, any>()

    for (
      const generated of generatedDays
    ) {
      const date =
        generated?.date ??
        generated?.day_date ??
        generated?.dayDate

      if (typeof date === "string") {
        generatedByDate.set(
          date,
          generated,
        )
      }
    }

    const normalizedDays =
      weekDates.map((date) => {
        const generated =
          generatedByDate.get(
            date,
          )

        if (!generated) {
          throw new Error(
            `Gemini did not return a plan for ${date}.`,
          )
        }

        const gravyRecipeId =
          resolveRecipeId(
            getDayRecipeValue(
              generated,
              "gravy",
            ),
            recipeCatalog,
            "gravy",
          )

        const poriyalRecipeId =
          resolveRecipeId(
            getDayRecipeValue(
              generated,
              "poriyal",
            ),
            recipeCatalog,
            "poriyal",
          )

        if (
          !gravyRecipeId ||
          !poriyalRecipeId
        ) {
          throw new Error(
            `Gemini returned an invalid recipe selection for ${date}.`,
          )
        }

        const previous =
          weeklyDays.find(
            (day) =>
              day.dayDate ===
              date,
          )

        return {
          day_date: date,
          gravy_recipe_id:
            gravyRecipeId,
          poriyal_recipe_id:
            poriyalRecipeId,
          breakfast_note:
            generated?.breakfast_note ??
            generated?.breakfastNote ??
            null,
          dinner_note:
            generated?.dinner_note ??
            generated?.dinnerNote ??
            null,
          reason:
            generated?.reason ??
            null,
          estimated_protein_g:
            generated?.estimated_protein_g ??
            generated?.estimatedProteinG ??
            null,
          estimated_fibre_g:
            generated?.estimated_fibre_g ??
            generated?.estimatedFibreG ??
            null,
          warnings:
            Array.isArray(
              generated?.warnings,
            )
              ? generated.warnings
              : [],
          actual_gravy_recipe_id:
            previous?.actualGravyRecipeId ??
            null,
          actual_poriyal_recipe_id:
            previous?.actualPoriyalRecipeId ??
            null,
          actual_meal_note:
            previous?.actualMealNote ??
            null,
          completed_at:
            previous?.completedAt ??
            null,
        }
      })

    const {
      data: plan,
      error: planError,
    } = await supabase
      .from("meal_plans")
      .insert({
        household_id:
          HOUSEHOLD_ID,
        week_start:
          weekStart,
        title:
          "AI Meal Plan",
      })
      .select("id")
      .single()

    if (planError || !plan) {
      throw (
        planError ??
        new Error(
          "Could not create the meal plan.",
        )
      )
    }

    const {
      error: dayError,
    } = await supabase
      .from("meal_plan_days")
      .insert(
        normalizedDays.map(
          (day) => ({
            meal_plan_id:
              plan.id,
            ...day,
          }),
        ),
      )

    if (dayError) {
      await supabase
        .from("meal_plans")
        .delete()
        .eq("id", plan.id)

      throw dayError
    }

    await loadWeeklyPlan()
  }

  async function generatePlan() {
    setGenerating(true)

    try {
      setCurrentView("week")

      const context =
        await loadPlannerAIContext()

      const result =
        await callPlannerAI(
          "planner",
          {
            ...context,
            task:
              `Generate a complete 7-day weekly meal plan for exactly these dates, in Monday-to-Sunday order: ${weekDates.join(", ")}. Return exactly one gravy recipe and one poriyal recipe for every one of those dates. Never add dates outside this range. Respect every date's onion/garlic restriction and additional restrictions/unavailable ingredients. Use recipe IDs from the supplied recipe catalogue whenever possible. Never invent recipe IDs.`,
          },
        )

      await saveGeneratedWeek(
        getGeneratedDays(result),
      )
    } catch (error) {
      console.error(
        "Could not generate meal plan:",
        error,
      )

      alert(
        error instanceof Error
          ? error.message
          : "Could not generate the meal plan.",
      )
    } finally {
      setGenerating(false)
    }
  }

  async function regenerateDay(
    day: WeeklyMealDay,
  ) {
    setGenerating(true)

    try {
      const context =
        await loadPlannerAIContext()

      const result =
        await callPlannerAI(
          "planner-day",
          {
            ...context,
            target_date:
              day.dayDate,
            existing_day: {
              date:
                day.dayDate,
              gravy_recipe_id:
                day.gravyRecipeId,
              poriyal_recipe_id:
                day.poriyalRecipeId,
              actual_gravy_recipe_id:
                day.actualGravyRecipeId,
              actual_poriyal_recipe_id:
                day.actualPoriyalRecipeId,
              completed_at:
                day.completedAt,
              additional_restrictions:
                dateRestrictions.find((item) => item.date === day.dayDate)?.additionalRestrictions ?? "",
            },
            task:
              "Regenerate only this date. Return exactly one gravy recipe and one poriyal recipe for the target date. Respect that date's onion/garlic restrictions, additional restrictions, unavailable ingredients, pantry availability, and all planner rules. Do not change any other date.",
          },
        )

      const generatedDays =
        getGeneratedDays(result)

      const generated =
        generatedDays.find(
          (item: any) =>
            (
              item?.date ??
              item?.day_date ??
              item?.dayDate
            ) ===
            day.dayDate,
        ) ??
        generatedDays[0] ??
        result?.day ??
        result

      const {
        data: recipeData,
        error: recipeError,
      } = await supabase
        .from("recipes")
        .select("id, name, type")
        .eq(
          "household_id",
          HOUSEHOLD_ID,
        )

      if (recipeError) {
        throw recipeError
      }

      const gravyRecipeId =
        resolveRecipeId(
          getDayRecipeValue(
            generated,
            "gravy",
          ),
          recipeData ?? [],
          "gravy",
        )

      const poriyalRecipeId =
        resolveRecipeId(
          getDayRecipeValue(
            generated,
            "poriyal",
          ),
          recipeData ?? [],
          "poriyal",
        )

      if (
        !gravyRecipeId ||
        !poriyalRecipeId
      ) {
        throw new Error(
          `Gemini returned an invalid meal for ${day.dayDate}.`,
        )
      }

      const { error } =
        await supabase
          .from("meal_plan_days")
          .update({
            gravy_recipe_id:
              gravyRecipeId,
            poriyal_recipe_id:
              poriyalRecipeId,
            breakfast_note:
              generated?.breakfast_note ??
              generated?.breakfastNote ??
              null,
            dinner_note:
              generated?.dinner_note ??
              generated?.dinnerNote ??
              null,
            reason:
              generated?.reason ??
              null,
            estimated_protein_g:
              generated?.estimated_protein_g ??
              generated?.estimatedProteinG ??
              null,
            estimated_fibre_g:
              generated?.estimated_fibre_g ??
              generated?.estimatedFibreG ??
              null,
            warnings:
              Array.isArray(
                generated?.warnings,
              )
                ? generated.warnings
                : [],
          })
          .eq(
            "id",
            day.id,
          )

      if (error) {
        throw error
      }

      await loadWeeklyPlan()
    } catch (error) {
      console.error(
        "Could not regenerate day:",
        error,
      )

      alert(
        error instanceof Error
          ? error.message
          : "Could not regenerate this day.",
      )
    } finally {
      setGenerating(false)
    }
  }

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

  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24">
        <div className="flex flex-col gap-5 pt-4">
          <AppHeader />

          {/* WEEK */}
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

              {saving && (
                <p className="text-center text-xs text-muted-foreground">
                  Saving…
                </p>
              )}

              <MealPlanner
                householdId={
                  HOUSEHOLD_ID
                }
                weekStart={
                  weekStart
                }
                days={
                  weeklyDays
                }
                pantry={
                  pantry
                }
                dateRestrictions={
                  dateRestrictions
                }
                recipes={
                  weeklyRecipes
                }
                loading={
                  weekLoading
                }
                generating={
                  generating
                }
                onWeekChange={(
                  nextWeek,
                ) => {
                  setWeekStart(
                    normalizeWeekStart(nextWeek),
                  )
                }}
                onToggleDateRestriction={
                  toggleDateRestriction
                }
                onChangeAdditionalRestriction={
                  changeAdditionalRestriction
                }
                onTogglePantry={
                  togglePlanningAvailability
                }
                onGenerate={
                  generatePlan
                }
                onRegenerateDay={
                  regenerateDay
                }
                onMarkCooked={
                  markCooked
                }
                onChangeMeal={
                  changeActualMeal
                }
              />
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
                onCookRecipe={(recipeId: string) => {
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
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3">
          <button
            type="button"
            onClick={
              goWeek
            }
            className={`flex flex-col items-center gap-1 px-3 py-3 text-xs font-semibold ${
              currentView ===
                "week"
                ? "text-primary"
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
            className={`flex flex-col items-center gap-1 px-3 py-3 text-xs font-semibold ${
              currentView ===
                "pantry"
                ? "text-primary"
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
            className={`flex flex-col items-center gap-1 px-3 py-3 text-xs font-semibold ${
              currentView ===
                "recipes"
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <ChefHat className="size-5" />
            Recipes
          </button>
        </div>
      </nav>

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
    </>
  )
}