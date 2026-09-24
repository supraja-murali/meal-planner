"use client"

import { useEffect, useState } from "react"

import { AppHeader } from "@/components/app-header"
import { NutritionTargetCard } from "@/components/nutrition-target-card"
import { PantrySection } from "@/components/pantry-section"
import {
  DietaryPreferences,
  type PreferenceKey,
} from "@/components/dietary-preferences"
import { CookingStructureCard } from "@/components/cooking-structure-card"
import { ProteinRuleCard } from "@/components/protein-rule-card"
import { PlanMealButton } from "@/components/plan-meal-button"

import { RecipeForm } from "@/components/recipe-form"
import { RecipeList } from "@/components/recipe-list"
import { CookingSession } from "@/components/cooking-session"

import { supabase } from "@/lib/supabase"

type Preferences = Record<PreferenceKey, boolean>

type PantryItem = {
  id: string
  name: string
  quantity: number
  unit: string
}

type View =
  | "home"
  | "recipes"
  | "add-recipe"
  | "cook"

const defaultPreferences: Preferences = {
  onion: false,
  garlic: false,
  egg: false,
  meat: false,
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null)

  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences)

  const [pantry, setPantry] = useState<PantryItem[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [currentView, setCurrentView] =
    useState<View>("home")

  const [householdId, setHouseholdId] =
    useState<string | null>(null)

  const [selectedRecipeId, setSelectedRecipeId] =
    useState<string | null>(null)

  useEffect(() => {
    loadApp()
  }, [])

  // ─────────────────────────────────────────────
  // Load existing Supabase session
  // ─────────────────────────────────────────────

  async function loadApp() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUser(user)

    if (user) {
      await loadHouseholdData(user.id)
    }

    setLoading(false)
  }

  // ─────────────────────────────────────────────
  // Household data
  // ─────────────────────────────────────────────

  async function loadHouseholdData(userId: string) {
    const { data: membership, error: membershipError } =
      await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", userId)
        .single()

    if (membershipError || !membership) {
      console.error(
        "Could not load household:",
        membershipError
      )
      return
    }

    const id = membership.household_id

    setHouseholdId(id)

    // Preferences
    const {
      data: preferenceData,
      error: preferenceError,
    } = await supabase
      .from("household_preferences")
      .select(
        "onion_allowed, garlic_allowed, egg_allowed, meat_allowed"
      )
      .eq("household_id", id)
      .single()

    if (!preferenceError && preferenceData) {
      setPreferences({
        onion: preferenceData.onion_allowed,
        garlic: preferenceData.garlic_allowed,
        egg: preferenceData.egg_allowed,
        meat: preferenceData.meat_allowed,
      })
    }

    // Pantry
    const {
      data: pantryData,
      error: pantryError,
    } = await supabase
      .from("pantry_items")
      .select(
        "id, quantity, unit, ingredients(name)"
      )
      .eq("household_id", id)
      .order("created_at", {
        ascending: true,
      })

    if (!pantryError && pantryData) {
      setPantry(
        pantryData.map((item: any) => ({
          id: item.id,
          name:
            item.ingredients?.name ??
            "Unknown ingredient",
          quantity: Number(item.quantity),
          unit: item.unit,
        }))
      )
    }
  }

  // ─────────────────────────────────────────────
  // Preferences
  // ─────────────────────────────────────────────

  async function togglePreference(
    key: PreferenceKey,
    value: boolean
  ) {
    if (!user || !householdId) return

    const previous = preferences[key]

    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }))

    const columnMap: Record<PreferenceKey, string> = {
      onion: "onion_allowed",
      garlic: "garlic_allowed",
      egg: "egg_allowed",
      meat: "meat_allowed",
    }

    setSaving(true)

    const { error } = await supabase
      .from("household_preferences")
      .update({
        [columnMap[key]]: value,
        updated_at: new Date().toISOString(),
      })
      .eq("household_id", householdId)

    if (error) {
      console.error(
        "Could not save preference:",
        error
      )

      setPreferences((prev) => ({
        ...prev,
        [key]: previous,
      }))
    }

    setSaving(false)
  }

  // ─────────────────────────────────────────────
  // Pantry
  // ─────────────────────────────────────────────

  async function addIngredient(
    name: string,
    quantity: number,
    unit: string
  ) {
    if (!user || !householdId) return

    const trimmed = name.trim()

    if (!trimmed) return

    const { data: ingredient } = await supabase
      .from("ingredients")
      .select("id, name")
      .ilike("name", trimmed)
      .maybeSingle()

    if (!ingredient) {
      alert(
        `"${trimmed}" is not in the ingredient catalogue yet.`
      )
      return
    }

    const alreadyExists = pantry.some(
      (item) =>
        item.name.toLowerCase() ===
        ingredient.name.toLowerCase()
    )

    if (alreadyExists) return

    const { data, error } = await supabase
      .from("pantry_items")
      .insert({
        household_id: householdId,
        ingredient_id: ingredient.id,
        quantity,
        unit,
      })
      .select(
        "id, quantity, unit, ingredients(name)"
      )
      .single()

    if (error) {
      console.error(
        "Could not add pantry item:",
        error
      )
      return
    }

    setPantry((prev) => [
      ...prev,
      {
        id: data.id,
        name:
          (data as any).ingredients?.name ??
          ingredient.name,
        quantity: Number(data.quantity),
        unit: data.unit,
      },
    ])
  }

  async function removeIngredient(id: string) {
    const { error } = await supabase
      .from("pantry_items")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(
        "Could not remove pantry item:",
        error
      )
      return
    }

    setPantry((prev) =>
      prev.filter((item) => item.id !== id)
    )
  }

  // ─────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          Loading Meal Planner…
        </p>
      </main>
    )
  }

  // ─────────────────────────────────────────────
  // No session
  //
  // Login UI is intentionally removed for now.
  // Supabase authentication remains underneath.
  // ─────────────────────────────────────────────

  if (!user || !householdId) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">
            Meal Planner
          </h1>

          <p className="text-sm text-muted-foreground">
            No active household session found.
          </p>

          <p className="text-xs text-muted-foreground">
            The login screen is currently disabled.
          </p>
        </div>
      </main>
    )
  }

  // ─────────────────────────────────────────────
  // Cooking session
  // ─────────────────────────────────────────────

  if (
    currentView === "cook" &&
    selectedRecipeId
  ) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-10">
        <div className="pt-4">
          <CookingSession
            recipeId={selectedRecipeId}
            householdId={householdId}
            pantry={pantry}
            onBack={() => {
              setSelectedRecipeId(null)
              setCurrentView("recipes")
            }}
            onFinished={() => {
              setSelectedRecipeId(null)
              setCurrentView("recipes")
            }}
          />
        </div>
      </main>
    )
  }

  // ─────────────────────────────────────────────
  // My Recipes
  // ─────────────────────────────────────────────

  if (currentView === "recipes") {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-10">
        <div className="pt-4">
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setCurrentView("home")}
              className="text-sm font-medium text-muted-foreground"
            >
              ← Home
            </button>
          </div>

          <RecipeList
            householdId={householdId}
            onAddRecipe={() =>
              setCurrentView("add-recipe")
            }
            onCookRecipe={(recipeId) => {
              setSelectedRecipeId(recipeId)
              setCurrentView("cook")
            }}
          />
        </div>
      </main>
    )
  }

  // ─────────────────────────────────────────────
  // Add Recipe
  // ─────────────────────────────────────────────

  if (currentView === "add-recipe") {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-10">
        <div className="pt-4">
          <RecipeForm
            userId={user.id}
            householdId={householdId}
            onCancel={() =>
              setCurrentView("recipes")
            }
            onSaved={() =>
              setCurrentView("recipes")
            }
          />
        </div>
      </main>
    )
  }

  // ─────────────────────────────────────────────
  // Home
  // ─────────────────────────────────────────────

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-10">
      <div className="flex flex-col gap-5 pt-4">
        <AppHeader />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setCurrentView("home")
            }
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${
              currentView === "home"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background"
            }`}
          >
            Home
          </button>

          <button
            type="button"
            onClick={() =>
              setCurrentView("recipes")
            }
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${
              currentView === "recipes"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background"
            }`}
          >
            My Recipes
          </button>
        </div>

        <NutritionTargetCard />

        <PantrySection
          items={pantry}
          onAdd={addIngredient}
          onRemove={removeIngredient}
        />

        <DietaryPreferences
          preferences={preferences}
          onToggle={togglePreference}
        />

        {saving && (
          <p className="text-center text-xs text-muted-foreground">
            Saving…
          </p>
        )}

        <CookingStructureCard />
        <ProteinRuleCard />
        <PlanMealButton />
      </div>
    </main>
  )
}
