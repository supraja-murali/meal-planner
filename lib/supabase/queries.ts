import { z } from "zod"
import { createClient } from "./client"
import type { Ingredient } from "@/types/ingredient"
import type { PantryItemWithIngredient } from "@/types/pantry"
import type { HouseholdPreferences, DietaryToggleKey } from "@/types/preferences"
import { PANTRY_UNITS } from "@/types/pantry"

/* Validation */

export const pantryItemInputSchema = z.object({
  ingredient_id: z.string().uuid("Please choose an ingredient."),
  quantity: z.coerce.number().positive("Quantity must be greater than zero."),
  unit: z.enum(PANTRY_UNITS),
})

export type PantryItemInput = z.infer<typeof pantryItemInputSchema>

export const pantryItemUpdateSchema = z.object({
  quantity: z.coerce.number().positive("Quantity must be greater than zero."),
  unit: z.enum(PANTRY_UNITS),
})

export type PantryItemUpdate = z.infer<typeof pantryItemUpdateSchema>

/* Ingredients */

export async function getIngredients(): Promise<Ingredient[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, name, category, created_at")
    .order("category", { ascending: true })
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Ingredient[]
}

/* Pantry */

export async function getPantryItems(): Promise<PantryItemWithIngredient[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("pantry_items")
    .select("id, ingredient_id, quantity, unit, created_at, updated_at, ingredient:ingredients(*)")
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PantryItemWithIngredient[]
}

export async function addPantryItem(input: PantryItemInput): Promise<void> {
  const parsed = pantryItemInputSchema.parse(input)
  const supabase = createClient()
  const { error } = await supabase.from("pantry_items").insert({
    ingredient_id: parsed.ingredient_id,
    quantity: parsed.quantity,
    unit: parsed.unit,
  })

  if (error) throw new Error(error.message)
}

export async function updatePantryItem(id: string, input: PantryItemUpdate): Promise<void> {
  const parsed = pantryItemUpdateSchema.parse(input)
  const supabase = createClient()
  const { error } = await supabase
    .from("pantry_items")
    .update({
      quantity: parsed.quantity,
      unit: parsed.unit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw new Error(error.message)
}

export async function deletePantryItem(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("pantry_items").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

/* Household preferences */

export async function getHouseholdPreferences(): Promise<HouseholdPreferences> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("household_preferences")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error("Household preferences not found.")
  return data as HouseholdPreferences
}

export async function updateDietaryToggle(id: string, key: DietaryToggleKey, value: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("household_preferences")
    .update({ [key]: value, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)
}
