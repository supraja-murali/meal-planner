"use client"

import { useEffect, useState } from "react"
import {
  Edit3,
  Heart,
  Plus,
  Search,
  Sparkles,
  Trash2,
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

type Recipe = {
  id: string
  name: string
  type:
    | "gravy"
    | "poriyal"
    | "dry_rice"
    | "other"
  servings: number
  favourite: boolean
  notes: string | null
}

type RecipeListProps = {
  householdId: string
  onAddRecipe: () => void
  onAddAIRecipe: () => void
  onEditRecipe: (recipeId: string) => void
  onCookRecipe: (
    recipeId: string,
  ) => void
}

function getRecipeTypeLabel(
  type: Recipe["type"],
) {
  switch (type) {
    case "gravy":
      return "Gravy"
    case "poriyal":
      return "Poriyal"
    case "dry_rice":
      return "Dry Rice"
    case "other":
      return "Other"
    default:
      return type
  }
}

export function RecipeList({
  householdId,
  onAddRecipe,
  onAddAIRecipe,
  onEditRecipe,
  onCookRecipe,
}: RecipeListProps) {
  const [
    recipes,
    setRecipes,
  ] = useState<Recipe[]>([])

  const [
    search,
    setSearch,
  ] = useState("")

  const [
    filter,
    setFilter,
  ] = useState<
    | "all"
    | "gravy"
    | "poriyal"
    | "dry_rice"
    | "other"
    | "favourite"
  >("all")

  const [
    loading,
    setLoading,
  ] = useState(true)

  useEffect(() => {
    loadRecipes()
  }, [householdId])

  async function loadRecipes() {
    setLoading(true)

    const {
      data,
      error,
    } = await supabase
      .from("recipes")
      .select(
        "id, name, type, servings, favourite, notes",
      )
      .eq(
        "household_id",
        householdId,
      )
      .order(
        "name",
        {
          ascending: true,
        },
      )

    if (error) {
      console.error(
        "Could not load recipes:",
        error,
      )

      setRecipes([])
    } else {
      setRecipes(
        (data ??
          []) as Recipe[],
      )
    }

    setLoading(false)
  }

  async function toggleFavourite(
    recipeId: string,
    currentValue: boolean,
  ) {
    const {
      error,
    } = await supabase
      .from("recipes")
      .update({
        favourite:
          !currentValue,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        recipeId,
      )
      .eq(
        "household_id",
        householdId,
      )

    if (error) {
      console.error(
        "Could not update favourite:",
        error,
      )

      return
    }

    setRecipes(
      (current) =>
        current.map(
          (recipe) =>
            recipe.id ===
            recipeId
              ? {
                  ...recipe,
                  favourite:
                    !currentValue,
                }
              : recipe,
        ),
    )
  }

  async function deleteRecipe(
    recipeId: string,
  ) {
    const confirmed =
      window.confirm(
        "Delete this recipe? This cannot be undone.",
      )

    if (!confirmed) return

    const {
      error,
    } = await supabase
      .from("recipes")
      .delete()
      .eq(
        "id",
        recipeId,
      )
      .eq(
        "household_id",
        householdId,
      )

    if (error) {
      console.error(
        "Could not delete recipe:",
        error,
      )

      return
    }

    setRecipes(
      (current) =>
        current.filter(
          (recipe) =>
            recipe.id !==
            recipeId,
        ),
    )
  }

  const filteredRecipes =
    recipes.filter(
      (recipe) => {
        const matchesSearch =
          recipe.name
            .toLowerCase()
            .includes(
              search.toLowerCase(),
            )

        if (!matchesSearch) {
          return false
        }

        if (
          filter ===
          "favourite"
        ) {
          return recipe.favourite
        }

        if (
          filter ===
          "all"
        ) {
          return true
        }

        return (
          recipe.type ===
          filter
        )
      },
    )

  return (
    <section className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              My Recipes
            </h2>

            <p className="text-sm text-muted-foreground">
              Your household&apos;s saved recipes
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={onAddRecipe}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onAddAIRecipe}
        >
          <Sparkles className="mr-2 size-4" />
          Describe a dish with AI
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Search recipes..."
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ["all", "All"],
          ["gravy", "Gravy"],
          [
            "poriyal",
            "Poriyal",
          ],
          ["dry_rice", "Dry Rice"],
          ["other", "Other"],
          [
            "favourite",
            "Favourites",
          ],
        ].map(
          ([
            value,
            label,
          ]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setFilter(
                  value as typeof filter,
                )
              }
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                filter === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading recipes…
        </p>
      ) : filteredRecipes.length ===
        0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="rounded-full bg-secondary p-3">
              <Search className="size-5 text-muted-foreground" />
            </div>

            <div>
              <p className="font-medium">
                {recipes.length ===
                0
                  ? "No recipes yet"
                  : "No matching recipes"}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {recipes.length ===
                0
                  ? "Save your first household recipe."
                  : "Try a different search or filter."}
              </p>
            </div>

            {recipes.length ===
              0 && (
              <Button
                type="button"
                onClick={
                  onAddRecipe
                }
                className="gap-2"
              >
                <Plus className="size-4" />
                Add your first recipe
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecipes.map(
            (recipe) => (
              <Card
                key={recipe.id}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {recipe.name}
                      </CardTitle>

                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {getRecipeTypeLabel(recipe.type)}
                        {" · Serves "}
                        {recipe.servings}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toggleFavourite(
                          recipe.id,
                          recipe.favourite,
                        )
                      }
                      className="flex size-9 items-center justify-center rounded-full border border-border"
                      aria-label={
                        recipe.favourite
                          ? `Remove ${recipe.name} from favourites`
                          : `Add ${recipe.name} to favourites`
                      }
                    >
                      <Heart
                        className={`size-4 ${
                          recipe.favourite
                            ? "fill-current text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {recipe.notes && (
                    <p className="text-sm text-muted-foreground">
                      {recipe.notes}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() =>
                        onCookRecipe(recipe.id)
                      }
                    >
                      Cook Again
                    </Button>

                    <button
                      type="button"
                      onClick={() =>
                        onEditRecipe(recipe.id)
                      }
                      className="flex size-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                      aria-label={`Edit ${recipe.name}`}
                    >
                      <Edit3 className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteRecipe(recipe.id)
                      }
                      className="flex size-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${recipe.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}
    </section>
  )
}