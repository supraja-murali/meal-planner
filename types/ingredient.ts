export type IngredientCategory = "Legumes" | "Vegetables" | "Protein" | "Grains"

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory | string
  created_at: string
}
