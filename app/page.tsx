"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { NutritionTargetCard } from "@/components/nutrition-target-card"
import { PantrySection } from "@/components/pantry-section"
import { DietaryPreferences, type PreferenceKey } from "@/components/dietary-preferences"
import { CookingStructureCard } from "@/components/cooking-structure-card"
import { ProteinRuleCard } from "@/components/protein-rule-card"
import { PlanMealButton } from "@/components/plan-meal-button"

const initialPantry = ["Toor dal", "Spinach", "Carrot", "Beans", "Tofu", "Paneer"]

export default function HomePage() {
  const [pantry, setPantry] = useState<string[]>(initialPantry)
  const [preferences, setPreferences] = useState<Record<PreferenceKey, boolean>>({
    onion: false,
    garlic: false,
    egg: false,
    meat: false,
  })

  function addIngredient(item: string) {
    setPantry((prev) => {
      const exists = prev.some((p) => p.toLowerCase() === item.toLowerCase())
      return exists ? prev : [...prev, item]
    })
  }

  function removeIngredient(item: string) {
    setPantry((prev) => prev.filter((p) => p !== item))
  }

  function togglePreference(key: PreferenceKey, value: boolean) {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-10">
      <div className="flex flex-col gap-5 pt-4">
        <AppHeader />
        <NutritionTargetCard />
        <PantrySection items={pantry} onAdd={addIngredient} onRemove={removeIngredient} />
        <DietaryPreferences preferences={preferences} onToggle={togglePreference} />
        <CookingStructureCard />
        <ProteinRuleCard />
        <PlanMealButton />
      </div>
    </main>
  )
}
