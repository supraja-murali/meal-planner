"use client"

import { useMemo, useState } from "react"
import {
  CalendarDays,
  Check,
  Edit3,
  Sparkles,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export type WeeklyRecipe = {
  id: string
  name: string
  type: "gravy" | "poriyal" | "other"
}

export type WeeklyMealDay = {
  id: string
  dayDate: string

  gravyRecipeId: string | null
  poriyalRecipeId: string | null

  breakfastNote: string | null
  dinnerNote: string | null

  reason: string | null

  estimatedProteinG: number | null
  estimatedFibreG: number | null

  warnings: string[] | null

  actualGravyRecipeId: string | null
  actualPoriyalRecipeId: string | null

  actualMealNote: string | null
  completedAt: string | null
}

type WeeklyMealPlanProps = {
  weekStart: string
  days: WeeklyMealDay[]
  recipes: WeeklyRecipe[]
  loading?: boolean

  onGenerate: () => void

  onMarkCooked: (
    day: WeeklyMealDay,
  ) => void

  onChangeMeal: (
    day: WeeklyMealDay,
    actualGravyRecipeId: string | null,
    actualPoriyalRecipeId: string | null,
    actualMealNote: string | null,
  ) => void
}

function getDayName(dateString: string) {
  return new Date(
    `${dateString}T00:00:00`,
  ).toLocaleDateString("en-US", {
    weekday: "long",
  })
}

function formatDate(dateString: string) {
  return new Date(
    `${dateString}T00:00:00`,
  ).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}

function getWeekEnd(weekStart: string) {
  const date = new Date(
    `${weekStart}T00:00:00`,
  )

  date.setDate(date.getDate() + 6)

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function WeeklyMealPlan({
  weekStart,
  days,
  recipes,
  loading = false,
  onGenerate,
  onMarkCooked,
  onChangeMeal,
}: WeeklyMealPlanProps) {
  const [editingDayId, setEditingDayId] =
    useState<string | null>(null)

  // These MUST contain recipe IDs, not recipe objects.
  // Explicit string typing prevents the select value
  // from being inferred as WeeklyRecipe | null | undefined.
  const [actualGravy, setActualGravy] =
    useState<string>("")

  const [actualPoriyal, setActualPoriyal] =
    useState<string>("")

  const [actualNote, setActualNote] =
    useState<string>("")

  const recipeMap = useMemo(() => {
    return new Map(
      recipes.map((recipe) => [
        recipe.id,
        recipe,
      ]),
    )
  }, [recipes])

  const hasPlan = days.length > 0

  function startEditing(day: WeeklyMealDay) {
    setEditingDayId(day.id)

    setActualGravy(
      day.actualGravyRecipeId ??
        day.gravyRecipeId ??
        "",
    )

    setActualPoriyal(
      day.actualPoriyalRecipeId ??
        day.poriyalRecipeId ??
        "",
    )

    setActualNote(day.actualMealNote ?? "")
  }

  function saveActualMeal(day: WeeklyMealDay) {
    onChangeMeal(
      day,
      actualGravy || null,
      actualPoriyal || null,
      actualNote.trim() || null,
    )

    setEditingDayId(null)
    setActualGravy("")
    setActualPoriyal("")
    setActualNote("")
  }

  function cancelEditing() {
    setEditingDayId(null)
    setActualGravy("")
    setActualPoriyal("")
    setActualNote("")
  }

  return (
    <section
      aria-labelledby="week-heading"
      className="flex flex-col gap-4"
    >
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle
                id="week-heading"
                className="flex items-center gap-2 text-xl"
              >
                <CalendarDays
                  className="size-5 text-primary"
                  aria-hidden="true"
                />

                This Week
              </CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(weekStart)} –{" "}
                {getWeekEnd(weekStart)}
              </p>
            </div>

            {hasPlan && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onGenerate}
              >
                <Sparkles
                  className="mr-1.5 size-4"
                  aria-hidden="true"
                />
                Update
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading this week's plan…
          </CardContent>
        </Card>
      ) : !hasPlan ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 px-5 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-2xl">
              🍛
            </div>

            <div>
              <h2 className="font-semibold">
                No meal plan yet
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Choose the ingredients you have available
                in your pantry and generate this week's
                meals.
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              className="w-full rounded-xl"
              onClick={onGenerate}
            >
              <Sparkles
                className="mr-2 size-4"
                aria-hidden="true"
              />
              Generate This Week&apos;s Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((day) => {
            const completed = Boolean(
              day.completedAt,
            )

            const plannedGravy =
              day.gravyRecipeId
                ? recipeMap.get(
                    day.gravyRecipeId,
                  )
                : null

            const plannedPoriyal =
              day.poriyalRecipeId
                ? recipeMap.get(
                    day.poriyalRecipeId,
                  )
                : null

            const actualGravyRecipe =
              day.actualGravyRecipeId
                ? recipeMap.get(
                    day.actualGravyRecipeId,
                  )
                : null

            const actualPoriyalRecipe =
              day.actualPoriyalRecipeId
                ? recipeMap.get(
                    day.actualPoriyalRecipeId,
                  )
                : null

            const displayGravy =
              actualGravyRecipe ??
              plannedGravy

            const displayPoriyal =
              actualPoriyalRecipe ??
              plannedPoriyal

            const editing =
              editingDayId === day.id

            return (
              <Card
                key={day.id}
                className={`border-border/70 transition-opacity ${
                  completed
                    ? "opacity-60"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-bold uppercase tracking-wide ${
                          completed
                            ? "line-through"
                            : "text-primary"
                        }`}
                      >
                        {getDayName(day.dayDate)} ·{" "}
                        {formatDate(day.dayDate)}
                      </div>

                      {!editing ? (
                        <>
                          <div
                            className={`mt-2 space-y-1 ${
                              completed
                                ? "line-through"
                                : ""
                            }`}
                          >
                            {displayGravy && (
                              <p className="text-base font-semibold">
                                {displayGravy.name}
                              </p>
                            )}

                            {displayPoriyal && (
                              <p className="text-sm text-muted-foreground">
                                {displayPoriyal.name}
                              </p>
                            )}

                            {day.actualMealNote && (
                              <p className="mt-2 text-sm font-medium">
                                {day.actualMealNote}
                              </p>
                            )}
                          </div>

                          {!completed && (
                            <>
                              {day.breakfastNote && (
                                <p className="mt-3 text-xs text-muted-foreground">
                                  <span className="font-semibold">
                                    Breakfast:
                                  </span>{" "}
                                  {day.breakfastNote}
                                </p>
                              )}

                              {day.dinnerNote && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  <span className="font-semibold">
                                    Dinner:
                                  </span>{" "}
                                  {day.dinnerNote}
                                </p>
                              )}
                            </>
                          )}

                          {completed && (
                            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                              <Check
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              Completed
                            </p>
                          )}

                          {!completed && (
                            <div className="mt-4 flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="flex-1"
                                onClick={() =>
                                  onMarkCooked(day)
                                }
                              >
                                <Check
                                  className="mr-1.5 size-4"
                                  aria-hidden="true"
                                />
                                Mark cooked
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  startEditing(day)
                                }
                              >
                                <Edit3
                                  className="mr-1.5 size-4"
                                  aria-hidden="true"
                                />
                                Change
                              </Button>
                            </div>
                          )}

                          {completed && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="mt-3 w-full"
                              onClick={() =>
                                startEditing(day)
                              }
                            >
                              <Edit3
                                className="mr-1.5 size-4"
                                aria-hidden="true"
                              />
                              Change actual meal
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="mt-4 flex flex-col gap-3">
                          <div>
                            <label
                              htmlFor={`actual-gravy-${day.id}`}
                              className="mb-1.5 block text-xs font-semibold"
                            >
                              Gravy
                            </label>

                            <select
                              id={`actual-gravy-${day.id}`}
                              value={actualGravy}
                              onChange={(event) =>
                                setActualGravy(
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                            >
                              <option value="">
                                No gravy / something else
                              </option>

                              {recipes
                                .filter(
                                  (recipe) =>
                                    recipe.type ===
                                    "gravy",
                                )
                                .map((recipe) => (
                                  <option
                                    key={recipe.id}
                                    value={recipe.id}
                                  >
                                    {recipe.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={`actual-poriyal-${day.id}`}
                              className="mb-1.5 block text-xs font-semibold"
                            >
                              Poriyal
                            </label>

                            <select
                              id={`actual-poriyal-${day.id}`}
                              value={actualPoriyal}
                              onChange={(event) =>
                                setActualPoriyal(
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                            >
                              <option value="">
                                No poriyal / something else
                              </option>

                              {recipes
                                .filter(
                                  (recipe) =>
                                    recipe.type ===
                                    "poriyal",
                                )
                                .map((recipe) => (
                                  <option
                                    key={recipe.id}
                                    value={recipe.id}
                                  >
                                    {recipe.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={`actual-note-${day.id}`}
                              className="mb-1.5 block text-xs font-semibold"
                            >
                              Something else / note
                            </label>

                            <textarea
                              id={`actual-note-${day.id}`}
                              value={actualNote}
                              onChange={(event) =>
                                setActualNote(
                                  event.target.value,
                                )
                              }
                              placeholder="e.g. Made potato kurma instead"
                              className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              className="flex-1"
                              onClick={() =>
                                saveActualMeal(day)
                              }
                            >
                              Save actual meal
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {hasPlan && (
        <p className="text-center text-xs text-muted-foreground">
          Your checked pantry ingredients are used when the
          plan is generated or updated.
        </p>
      )}
    </section>
  )
}