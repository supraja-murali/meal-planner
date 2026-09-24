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
import { supabase } from "@/lib/supabase"
import { RecipeForm } from "@/components/recipe-form"
import { RecipeList } from "@/components/recipe-list"

type Preferences = Record<PreferenceKey, boolean>

type PantryItem = {
  id: string
  name: string
  quantity: number
  unit: string
}

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
  const [authLoading, setAuthLoading] = useState(false)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [currentView, setCurrentView] = useState<
    "home" | "recipes" | "add-recipe"
  >("home")
  const [householdId, setHouseholdId] = useState<string | null>(null)

  useEffect(() => {
    loadApp()
  }, [])

  async function loadApp() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUser(user)

    if (!user) {
      setLoading(false)
      return
    }

    await loadHouseholdData(user.id)

    setLoading(false)
  }

  async function loadHouseholdData(userId: string) {
    const { data: membership, error: membershipError } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", userId)
      .single()

    if (membershipError || !membership) {
      console.error("Could not load household:", membershipError)
      return
    }

    const householdId = membership.household_id
    setHouseholdId(householdId)

    const { data: preferenceData, error: preferenceError } =
      await supabase
        .from("household_preferences")
        .select(
          "onion_allowed, garlic_allowed, egg_allowed, meat_allowed"
        )
        .eq("household_id", householdId)
        .single()

    if (!preferenceError && preferenceData) {
      setPreferences({
        onion: preferenceData.onion_allowed,
        garlic: preferenceData.garlic_allowed,
        egg: preferenceData.egg_allowed,
        meat: preferenceData.meat_allowed,
      })
    }

    const { data: pantryData, error: pantryError } = await supabase
      .from("pantry_items")
      .select(
        "id, quantity, unit, ingredients(name)"
      )
      .eq("household_id", householdId)
      .order("created_at", { ascending: true })

    if (!pantryError && pantryData) {
      setPantry(
        pantryData.map((item: any) => ({
          id: item.id,
          name: item.ingredients?.name ?? "Unknown ingredient",
          quantity: Number(item.quantity),
          unit: item.unit,
        }))
      )
    }
  }

  async function signIn() {
    setAuthLoading(true)
    setAuthError("")

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setAuthError(error.message)
      setAuthLoading(false)
      return
    }

    setUser(data.user)

    if (data.user) {
      await loadHouseholdData(data.user.id)
    }

    setAuthLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()

    setUser(null)
    setPantry([])
    setPreferences(defaultPreferences)
  }

  async function togglePreference(
    key: PreferenceKey,
    value: boolean
  ) {
    if (!user) return

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

    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      setPreferences((prev) => ({
        ...prev,
        [key]: previous,
      }))
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from("household_preferences")
      .update({
        [columnMap[key]]: value,
        updated_at: new Date().toISOString(),
      })
      .eq("household_id", membership.household_id)

    if (error) {
      console.error("Could not save preference:", error)

      setPreferences((prev) => ({
        ...prev,
        [key]: previous,
      }))
    }

    setSaving(false)
  }

  async function addIngredient(
    name: string,
    quantity: number,
    unit: string
  ) {
    if (!user) return

    const trimmed = name.trim()

    if (!trimmed) return

    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .single()

    if (!membership) return

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
        item.name.toLowerCase() === ingredient.name.toLowerCase()
    )

    if (alreadyExists) return

    const { data, error } = await supabase
      .from("pantry_items")
      .insert({
        household_id: membership.household_id,
        ingredient_id: ingredient.id,
        quantity,
        unit,
      })
      .select("id, quantity, unit, ingredients(name)")
      .single()

    if (error) {
      console.error("Could not add pantry item:", error)
      return
    }

    setPantry((prev) => [
      ...prev,
      {
        id: data.id,
        name: (data as any).ingredients.name,
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
      console.error("Could not remove pantry item:", error)
      return
    }

    setPantry((prev) => prev.filter((item) => item.id !== id))
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          Loading Namma Saapadu…
        </p>
      </main>
    )
  }

  if (!user) {
    if (currentView === "recipes" && householdId) {
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
              onAddRecipe={() => setCurrentView("add-recipe")}
              onCookRecipe={(recipeId) => {
                console.log("Cook recipe:", recipeId)
              }}
            />
          </div>
        </main>
      )
    }

    if (currentView === "add-recipe" && householdId) {
      return (
        <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-10">
          <div className="pt-4">
            <RecipeForm
              userId={user.id}
              householdId={householdId}
              onCancel={() => setCurrentView("recipes")}
              onSaved={() => setCurrentView("recipes")}
            />
          </div>
        </main>
      )
    }
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4">
        <div className="w-full space-y-5">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">
              Namma Saapadu
            </h1>
            <p className="text-sm text-muted-foreground">
              Your household meal planner
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border p-5">
            <h2 className="text-lg font-semibold">
              Sign in
            </h2>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            />

            {authError && (
              <p className="text-sm text-destructive">
                {authError}
              </p>
            )}

            <button
              type="button"
              onClick={signIn}
              disabled={
                authLoading ||
                !email.trim() ||
                !password
              }
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {authLoading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-10">
      <div className="flex flex-col gap-5 pt-4">
        <AppHeader />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrentView("home")}
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
            onClick={() => setCurrentView("recipes")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${
              currentView === "recipes"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background"
            }`}
          >
            My Recipes
          </button>
        </div>

        <div className="flex items-center justify-between">
          <p className="truncate text-xs text-muted-foreground">
            {user.email}
          </p>

          <button
            type="button"
            onClick={signOut}
            className="text-xs font-medium text-muted-foreground underline"
          >
            Sign out
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
