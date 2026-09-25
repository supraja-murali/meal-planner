"use client"

import { useEffect, useRef, useState } from "react"
import {
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type RecipeIngredient = {
  localId: string
  ingredientName: string
  quantity: string
  unit: string
  required: boolean
  ingredientId?: string
}

type IngredientSuggestion = {
  id: string
  name: string
}

type RecipeFormProps = {
  userId: string
  householdId: string
  recipeId?: string | null
  onSaved?: () => void
  onCancel?: () => void
}

const UNIT_OPTIONS = [
  { value: "pcs", label: "pcs" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "L", label: "L" },
  { value: "tbsp", label: "tbsp" },
  { value: "tsp", label: "tsp" },
  { value: "cup", label: "cup" },
  { value: "pack", label: "pack" },
]

function createEmptyIngredient(): RecipeIngredient {
  return {
    localId: crypto.randomUUID(),
    ingredientName: "",
    quantity: "",
    unit: "pcs",
    required: true,
  }
}

export function RecipeForm({
  userId,
  householdId,
  recipeId,
  onSaved,
  onCancel,
}: RecipeFormProps) {
  const [name, setName] = useState("")
  const [type, setType] =
    useState<"gravy" | "poriyal" | "dry_rice" | "other">("gravy")
  const [servings, setServings] = useState("2")
  const [notes, setNotes] = useState("")

  const [ingredients, setIngredients] = useState<
    RecipeIngredient[]
  >([])

  const [steps, setSteps] = useState<string[]>([""])

  const [ingredientName, setIngredientName] = useState("")
  const [ingredientId, setIngredientId] = useState<
    string | undefined
  >(undefined)
  const [ingredientQuantity, setIngredientQuantity] =
    useState("")
  const [ingredientUnit, setIngredientUnit] =
    useState("pcs")
  const [ingredientRequired, setIngredientRequired] =
    useState(true)

  const [suggestions, setSuggestions] = useState<
    IngredientSuggestion[]
  >([])
  const [showSuggestions, setShowSuggestions] =
    useState(false)
  const [searching, setSearching] = useState(false)

  const ingredientInputRef =
    useRef<HTMLInputElement>(null)

  const suggestionContainerRef =
    useRef<HTMLDivElement>(null)

  const [saving, setSaving] = useState(false)
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [error, setError] = useState("")

  // userId is retained because the parent already supplies it.
  // The current recipe tables are scoped by household_id.
  void userId

  // ─────────────────────────────────────────────
  // Ingredient catalogue search
  // ─────────────────────────────────────────────

  useEffect(() => {
    const searchText = ingredientName.trim()

    if (!searchText) {
      setSuggestions([])
      setSearching(false)
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      setSearching(true)

      const { data, error } = await supabase
        .from("ingredients")
        .select("id, name")
        .ilike("name", `%${searchText}%`)
        .order("name", { ascending: true })
        .limit(50)

      if (cancelled) {
        return
      }

      setSearching(false)

      if (error) {
        console.error(
          "Could not search ingredients:",
          error
        )
        setSuggestions([])
        return
      }

      setSuggestions(data ?? [])
    }, 180)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [ingredientName])

  // ─────────────────────────────────────────────
  // Close autocomplete when clicking outside
  // ─────────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionContainerRef.current &&
        !suggestionContainerRef.current.contains(
          event.target as Node
        )
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    )

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      )
    }
  }, [])

  // ─────────────────────────────────────────────
  // Select autocomplete suggestion
  // ─────────────────────────────────────────────

  function selectSuggestion(
    suggestion: IngredientSuggestion
  ) {
    setIngredientName(suggestion.name)
    setIngredientId(suggestion.id)
    setShowSuggestions(false)

    // Focus quantity so adding the next ingredient is fast.
    window.setTimeout(() => {
      const quantityInput =
        document.getElementById(
          "recipe-ingredient-quantity"
        )

      quantityInput?.focus()
    }, 0)
  }

  // ─────────────────────────────────────────────
  // Add ingredient to draft
  // ─────────────────────────────────────────────

  function addIngredient() {
    const trimmedName = ingredientName.trim()

    if (!trimmedName) {
      setError("Please enter an ingredient.")
      ingredientInputRef.current?.focus()
      return
    }

    if (
      ingredientQuantity.trim() &&
      (!Number.isFinite(Number(ingredientQuantity)) ||
        Number(ingredientQuantity) < 0)
    ) {
      setError("Please enter a valid ingredient quantity.")
      return
    }

    const newIngredient: RecipeIngredient = {
      localId: crypto.randomUUID(),
      ingredientName: trimmedName,
      quantity: ingredientQuantity.trim(),
      unit: ingredientUnit,
      required: ingredientRequired,
      ingredientId,
    }

    setIngredients((previous) => [
      ...previous,
      newIngredient,
    ])

    // Reset only the entry form.
    setIngredientName("")
    setIngredientId(undefined)
    setIngredientQuantity("")
    setIngredientUnit("pcs")
    setIngredientRequired(true)
    setSuggestions([])
    setShowSuggestions(false)
    setError("")

    // Keep focus on ingredient input.
    window.setTimeout(() => {
      ingredientInputRef.current?.focus()
    }, 0)
  }

  // ─────────────────────────────────────────────
  // Delete ingredient
  // ─────────────────────────────────────────────

  function deleteIngredient(localId: string) {
    setIngredients((previous) =>
      previous.filter(
        (ingredient) =>
          ingredient.localId !== localId
      )
    )
  }

  // ─────────────────────────────────────────────
  // Edit ingredient
  // ─────────────────────────────────────────────

  function updateIngredient(
    localId: string,
    changes: Partial<RecipeIngredient>
  ) {
    setIngredients((previous) =>
      previous.map((ingredient) =>
        ingredient.localId === localId
          ? {
              ...ingredient,
              ...changes,
            }
          : ingredient
      )
    )
  }

  // ─────────────────────────────────────────────
  // Steps
  // ─────────────────────────────────────────────

  function addStep() {
    setSteps((previous) => [
      ...previous,
      "",
    ])
  }

  function removeStep(index: number) {
    setSteps((previous) => {
      if (previous.length === 1) {
        return previous
      }

      return previous.filter(
        (_, stepIndex) =>
          stepIndex !== index
      )
    })
  }

  function updateStep(
    index: number,
    value: string
  ) {
    setSteps((previous) =>
      previous.map((step, stepIndex) =>
        stepIndex === index
          ? value
          : step
      )
    )
  }

  
  // ─────────────────────────────────────────────
  // Save recipe
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!recipeId) {
      return
    }

    async function loadRecipe() {
      setLoadingRecipe(true)
      setError("")

      try {
        const [
          recipeResult,
          ingredientsResult,
          stepsResult,
        ] = await Promise.all([
          supabase
            .from("recipes")
            .select(
              "id, name, type, servings, notes",
            )
            .eq("id", recipeId)
            .eq("household_id", householdId)
            .single(),

          supabase
            .from("recipe_ingredients")
            .select(
              "ingredient_id, ingredient_name, quantity, unit, required",
            )
            .eq("recipe_id", recipeId)
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from("recipe_steps")
            .select(
              "step_number, instruction",
            )
            .eq("recipe_id", recipeId)
            .order("step_number", {
              ascending: true,
            }),
        ])

        if (recipeResult.error) {
          throw recipeResult.error
        }

        if (ingredientsResult.error) {
          throw ingredientsResult.error
        }

        if (stepsResult.error) {
          throw stepsResult.error
        }

        const recipe = recipeResult.data

        setName(recipe.name)
        setType(
          recipe.type as
            | "gravy"
            | "poriyal"
            | "dry_rice"
            | "other",
        )
        setServings(
          String(recipe.servings ?? 2),
        )
        setNotes(recipe.notes ?? "")

        setIngredients(
          (ingredientsResult.data ?? []).map(
            (ingredient) => ({
              localId: crypto.randomUUID(),
              ingredientName:
                ingredient.ingredient_name,
              quantity:
                ingredient.quantity === null
                  ? ""
                  : String(
                      ingredient.quantity,
                    ),
              unit:
                ingredient.unit ?? "pcs",
              required:
                ingredient.required ?? true,
              ingredientId:
                ingredient.ingredient_id ??
                undefined,
            }),
          ),
        )

        const loadedSteps =
          (stepsResult.data ?? [])
            .sort(
              (a, b) =>
                a.step_number -
                b.step_number,
            )
            .map(
              (step) =>
                step.instruction,
            )

        setSteps(
          loadedSteps.length > 0
            ? loadedSteps
            : [""],
        )
      } catch (err) {
        console.error(
          "Could not load recipe:",
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : "Could not load recipe.",
        )
      } finally {
        setLoadingRecipe(false)
      }
    }

    void loadRecipe()
  }, [recipeId, householdId])

  async function saveRecipe() {
    setError("")

    if (!name.trim()) {
      setError("Please enter a recipe name.")
      return
    }

    if (ingredients.length === 0) {
      setError("Please add at least one ingredient.")
      return
    }

    const validIngredients =
      ingredients.filter(
        (ingredient) =>
          ingredient.ingredientName.trim(),
      )

    if (validIngredients.length === 0) {
      setError(
        "Please add at least one ingredient.",
      )
      return
    }

    const validSteps = steps
      .map((step) => step.trim())
      .filter(Boolean)

    setSaving(true)

    try {
      let savedRecipeId = recipeId

      // ───────────────────────────────────────
      // Create or update recipe
      // ───────────────────────────────────────

      if (recipeId) {
        const {
          error: recipeError,
        } = await supabase
          .from("recipes")
          .update({
            name: name.trim(),
            type,
            servings:
              Number(servings) || 2,
            notes:
              notes.trim() || null,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", recipeId)
          .eq(
            "household_id",
            householdId,
          )

        if (recipeError) {
          throw recipeError
        }
      } else {
        const {
          data: recipe,
          error: recipeError,
        } = await supabase
          .from("recipes")
          .insert({
            household_id:
              householdId,
            name: name.trim(),
            type,
            servings:
              Number(servings) || 2,
            notes:
              notes.trim() || null,
          })
          .select("id")
          .single()

        if (recipeError || !recipe) {
          throw (
            recipeError ??
            new Error(
              "Could not create recipe.",
            )
          )
        }

        savedRecipeId = recipe.id
      }

      if (!savedRecipeId) {
        throw new Error(
          "Could not determine recipe ID.",
        )
      }

      // ───────────────────────────────────────
      // Replace ingredients
      // ───────────────────────────────────────

      const {
        error: deleteIngredientsError,
      } = await supabase
        .from("recipe_ingredients")
        .delete()
        .eq(
          "recipe_id",
          savedRecipeId,
        )

      if (deleteIngredientsError) {
        throw deleteIngredientsError
      }

      const ingredientRows =
        validIngredients.map(
          (ingredient) => ({
            recipe_id:
              savedRecipeId,
            ingredient_id:
              ingredient.ingredientId ??
              null,
            ingredient_name:
              ingredient.ingredientName.trim(),
            quantity:
              ingredient.quantity
                ? Number(
                    ingredient.quantity,
                  )
                : null,
            unit:
              ingredient.unit.trim() ||
              null,
            required:
              ingredient.required,
          }),
        )

      const {
        error: ingredientsError,
      } = await supabase
        .from("recipe_ingredients")
        .insert(
          ingredientRows,
        )

      if (ingredientsError) {
        throw ingredientsError
      }

      // ───────────────────────────────────────
      // Replace cooking steps
      // ───────────────────────────────────────

      const {
        error: deleteStepsError,
      } = await supabase
        .from("recipe_steps")
        .delete()
        .eq(
          "recipe_id",
          savedRecipeId,
        )

      if (deleteStepsError) {
        throw deleteStepsError
      }

      if (validSteps.length > 0) {
        const stepRows =
          validSteps.map(
            (
              instruction,
              index,
            ) => ({
              recipe_id:
                savedRecipeId,
              step_number:
                index + 1,
              instruction,
            }),
          )

        const {
          error: stepsError,
        } = await supabase
          .from("recipe_steps")
          .insert(
            stepRows,
          )

        if (stepsError) {
          throw stepsError
        }
      }

      onSaved?.()
    } catch (err) {
      console.error(
        "Could not save recipe:",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the recipe.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>
            {recipeId
              ? "Edit Recipe"
              : "Add Recipe"}
          </CardTitle>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ═══════════════════════════════════════ */}
        {/* Recipe details */}
        {/* ═══════════════════════════════════════ */}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Recipe name
            </label>

            <Input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. Tomato sambar"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type
              </label>

              <select
                value={type}
                onChange={(event) =>
                  setType(
                    event.target.value as
                      | "gravy"
                      | "poriyal"
                      | "dry_rice"
                      | "other"
                  )
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="gravy">
                  Gravy
                </option>

                <option value="poriyal">
                  Poriyal
                </option>

                <option value="dry_rice">
                  Dry Rice
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Servings
              </label>

              <Input
                type="number"
                min="1"
                value={servings}
                onChange={(event) =>
                  setServings(
                    event.target.value
                  )
                }
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* Ingredients */}
        {/* ═══════════════════════════════════════ */}

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">
              Ingredients
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              Add each ingredient below. Added
              ingredients will appear underneath.
            </p>
          </div>

          {/* ───────────────────────────────────── */}
          {/* Add ingredient container */}
          {/* ───────────────────────────────────── */}

          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <div
              ref={suggestionContainerRef}
              className="relative"
            >
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Ingredient
              </label>

              <Input
                ref={ingredientInputRef}
                value={ingredientName}
                onChange={(event) => {
                  setIngredientName(
                    event.target.value
                  )
                  setIngredientId(undefined)
                  setShowSuggestions(true)
                  setError("")
                }}
                onFocus={() => {
                  if (
                    suggestions.length > 0
                  ) {
                    setShowSuggestions(true)
                  }
                }}
                placeholder="Search or type an ingredient..."
                autoComplete="off"
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !showSuggestions
                  ) {
                    event.preventDefault()
                    addIngredient()
                  }
                }}
              />

              {/* Autocomplete */}
              {showSuggestions &&
                ingredientName.trim() && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-xl">
                    {searching ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground">
                        Searching ingredients…
                      </div>
                    ) : suggestions.length >
                      0 ? (
                      <div className="max-h-56 overflow-y-auto overscroll-contain">
                        {suggestions.map(
                          (suggestion) => (
                            <button
                              key={
                                suggestion.id
                              }
                              type="button"
                              onMouseDown={(
                                event
                              ) =>
                                event.preventDefault()
                              }
                              onClick={() =>
                                selectSuggestion(
                                  suggestion
                                )
                              }
                              className="block w-full px-3 py-2.5 text-left text-sm hover:bg-muted"
                            >
                              {suggestion.name}
                            </button>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="px-3 py-3 text-sm text-muted-foreground">
                        No matching ingredient.
                        You can still add it
                        manually.
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Quantity / unit */}
            <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Quantity
                </label>

                <Input
                  id="recipe-ingredient-quantity"
                  type="number"
                  min="0"
                  step="any"
                  value={ingredientQuantity}
                  onChange={(event) =>
                    setIngredientQuantity(
                      event.target.value
                    )
                  }
                  placeholder="3"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Unit
                </label>

                <select
                  value={ingredientUnit}
                  onChange={(event) =>
                    setIngredientUnit(
                      event.target.value
                    )
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {UNIT_OPTIONS.map(
                    (unit) => (
                      <option
                        key={unit.value}
                        value={unit.value}
                      >
                        {unit.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  size="icon"
                  onClick={addIngredient}
                  disabled={
                    !ingredientName.trim()
                  }
                  aria-label="Add ingredient"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Required / Optional */}
            <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={ingredientRequired}
                onChange={(event) =>
                  setIngredientRequired(
                    event.target.checked
                  )
                }
                className="h-4 w-4"
              />

              Required ingredient
            </label>
          </div>

          {/* ───────────────────────────────────── */}
          {/* Added ingredients */}
          {/* ───────────────────────────────────── */}

          {ingredients.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border">
              {ingredients.map(
                (ingredient, index) => (
                  <RecipeIngredientRow
                    key={
                      ingredient.localId
                    }
                    ingredient={ingredient}
                    index={index}
                    onChange={(
                      changes
                    ) =>
                      updateIngredient(
                        ingredient.localId,
                        changes
                      )
                    }
                    onDelete={() =>
                      deleteIngredient(
                        ingredient.localId
                      )
                    }
                  />
                )
              )}
            </div>
          )}

          {ingredients.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
              No ingredients added yet.
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* Cooking steps */}
        {/* ═══════════════════════════════════════ */}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Cooking steps
            </h3>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStep}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add step
            </Button>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-2"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
                  {index + 1}
                </div>

                <textarea
                  value={step}
                  onChange={(event) =>
                    updateStep(
                      index,
                      event.target.value
                    )
                  }
                  placeholder={`Step ${
                    index + 1
                  }`}
                  rows={2}
                  className="min-h-[72px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />

                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      removeStep(index)
                    }
                    className="mt-2 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete step ${
                      index + 1
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* Notes */}
        {/* ═══════════════════════════════════════ */}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Notes
          </label>

          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value
              )
            }
            placeholder="Optional notes about this recipe"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* Error */}
        {/* ═══════════════════════════════════════ */}

        {error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* Actions */}
        {/* ═══════════════════════════════════════ */}

        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          )}

          <Button
            type="button"
            className="flex-1"
            onClick={saveRecipe}
             disabled={saving || loadingRecipe}
          >
            {saving
              ? "Saving…"
              : recipeId
                ? "Save Changes"
                : "Save Recipe"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ═══════════════════════════════════════════════ */
/* Added ingredient row                           */
/* ═══════════════════════════════════════════════ */

type RecipeIngredientRowProps = {
  ingredient: RecipeIngredient
  index: number
  onChange: (
    changes: Partial<RecipeIngredient>
  ) => void
  onDelete: () => void
}

function RecipeIngredientRow({
  ingredient,
  index,
  onChange,
  onDelete,
}: RecipeIngredientRowProps) {
  const [editing, setEditing] =
    useState(false)

  const [editName, setEditName] =
    useState(ingredient.ingredientName)

  const [editQuantity, setEditQuantity] =
    useState(ingredient.quantity)

  const [editUnit, setEditUnit] =
    useState(
      ingredient.unit || "pcs"
    )

  const [editRequired, setEditRequired] =
    useState(ingredient.required)

  const [editSuggestions, setEditSuggestions] =
    useState<IngredientSuggestion[]>([])

  const [showEditSuggestions, setShowEditSuggestions] =
    useState(false)

  const [searchingEdit, setSearchingEdit] =
    useState(false)

  const editContainerRef =
    useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editing) {
      return
    }

    const searchText =
      editName.trim()

    if (!searchText) {
      setEditSuggestions([])
      setSearchingEdit(false)
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      setSearchingEdit(true)

      const { data, error } =
        await supabase
          .from("ingredients")
          .select("id, name")
          .ilike(
            "name",
            `%${searchText}%`
          )
          .order("name", {
            ascending: true,
          })
          .limit(50)

      if (cancelled) {
        return
      }

      setSearchingEdit(false)

      if (error) {
        console.error(
          "Could not search ingredients:",
          error
        )
        setEditSuggestions([])
        return
      }

      setEditSuggestions(
        data ?? []
      )
    }, 180)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [editName, editing])

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        editContainerRef.current &&
        !editContainerRef.current.contains(
          event.target as Node
        )
      ) {
        setShowEditSuggestions(false)
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    )

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      )
    }
  }, [])

  function startEditing() {
    setEditName(
      ingredient.ingredientName
    )
    setEditQuantity(
      ingredient.quantity
    )
    setEditUnit(
      ingredient.unit || "pcs"
    )
    setEditRequired(
      ingredient.required
    )
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setShowEditSuggestions(false)
  }

  function saveEditing() {
    if (!editName.trim()) {
      return
    }

    if (
      editQuantity.trim() &&
      (!Number.isFinite(
        Number(editQuantity)
      ) ||
        Number(editQuantity) < 0)
    ) {
      return
    }

    onChange({
      ingredientName:
        editName.trim(),
      quantity:
        editQuantity.trim(),
      unit: editUnit,
      required: editRequired,
    })

    setEditing(false)
    setShowEditSuggestions(false)
  }

  function selectEditSuggestion(
    suggestion: IngredientSuggestion
  ) {
    setEditName(suggestion.name)

    onChange({
      ingredientId: suggestion.id,
    })

    setShowEditSuggestions(false)
  }

  if (editing) {
    return (
      <div className="border-b border-border p-3 last:border-b-0">
        <div
          ref={editContainerRef}
          className="relative"
        >
          <Input
            value={editName}
            onChange={(event) => {
              setEditName(
                event.target.value
              )

              onChange({
                ingredientId:
                  undefined,
              })

              setShowEditSuggestions(
                true
              )
            }}
            onFocus={() => {
              if (
                editSuggestions.length >
                0
              ) {
                setShowEditSuggestions(
                  true
                )
              }
            }}
            autoComplete="off"
          />

          {showEditSuggestions &&
            editName.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-xl">
                {searchingEdit ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Searching…
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {editSuggestions.map(
                      (suggestion) => (
                        <button
                          key={
                            suggestion.id
                          }
                          type="button"
                          onMouseDown={(
                            event
                          ) =>
                            event.preventDefault()
                          }
                          onClick={() =>
                            selectEditSuggestion(
                              suggestion
                            )
                          }
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          {
                            suggestion.name
                          }
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
        </div>

        <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            type="number"
            min="0"
            step="any"
            value={editQuantity}
            onChange={(event) =>
              setEditQuantity(
                event.target.value
              )
            }
            placeholder="Quantity"
          />

          <select
            value={editUnit}
            onChange={(event) =>
              setEditUnit(
                event.target.value
              )
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {UNIT_OPTIONS.map(
              (unit) => (
                <option
                  key={unit.value}
                  value={unit.value}
                >
                  {unit.label}
                </option>
              )
            )}
          </select>

          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              onClick={saveEditing}
              aria-label="Save ingredient"
            >
              <Check className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={cancelEditing}
              aria-label="Cancel editing"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={editRequired}
            onChange={(event) =>
              setEditRequired(
                event.target.checked
              )
            }
            className="h-4 w-4"
          />

          Required ingredient
        </label>
      </div>
    )
  }

  return (
    <div className="flex min-h-12 items-center gap-2 border-b border-border px-3 py-2 last:border-b-0">
      {/* Ingredient number */}
      <span className="w-5 shrink-0 text-xs text-muted-foreground">
        {index + 1}
      </span>

      {/* Ingredient details */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {ingredient.ingredientName}
        </div>

        <div className="text-xs text-muted-foreground">
          {ingredient.quantity
            ? `${ingredient.quantity} ${
                ingredient.unit || ""
              }`
            : "Amount not specified"}

          {" · "}

          {ingredient.required
            ? "Required"
            : "Optional"}
        </div>
      </div>

      {/* Edit */}
      <button
        type="button"
        onClick={startEditing}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Edit ${ingredient.ingredientName}`}
      >
        <Pencil className="h-4 w-4" />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Delete ${ingredient.ingredientName}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}