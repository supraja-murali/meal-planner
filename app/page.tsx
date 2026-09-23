import { AppHeader } from "@/components/app-header"
import { NutritionTargetCard } from "@/components/nutrition-target-card"
import { PantryList } from "@/components/pantry/PantryList"
import { DietaryPreferences } from "@/components/preferences/DietaryPreferences"
import { CookingStructureCard } from "@/components/cooking-structure-card"
import { ProteinRuleCard } from "@/components/protein-rule-card"
import { PlanMealButton } from "@/components/plan-meal-button"

export default function HomePage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-10">
      <div className="flex flex-col gap-5 pt-4">
        <AppHeader />
        <NutritionTargetCard />
        <PantryList />
        <DietaryPreferences />
        <CookingStructureCard />
        <ProteinRuleCard />
        <PlanMealButton />
      </div>
    </main>
  )
}
