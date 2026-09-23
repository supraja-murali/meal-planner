export interface HouseholdPreferences {
  id: string
  household_size: number
  protein_min_g_per_person: number
  protein_max_g_per_person: number
  fibre_min_g_per_person: number
  onion_allowed: boolean
  garlic_allowed: boolean
  egg_allowed: boolean
  meat_allowed: boolean
  created_at: string
  updated_at: string
}

export type DietaryToggleKey = "onion_allowed" | "garlic_allowed" | "egg_allowed" | "meat_allowed"
