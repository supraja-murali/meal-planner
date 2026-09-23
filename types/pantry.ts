import type { Ingredient } from "./ingredient"

export const PANTRY_UNITS = ["g", "kg", "ml", "L", "pieces", "pack"] as const

export type PantryUnit = (typeof PANTRY_UNITS)[number]

export interface PantryItem {
  id: string
  ingredient_id: string
  quantity: number
  unit: string
  created_at: string
  updated_at: string
}

export interface PantryItemWithIngredient extends PantryItem {
  ingredient: Ingredient
}
