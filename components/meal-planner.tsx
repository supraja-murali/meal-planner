"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react"


import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type DateRestriction = {
  date: string
  noOnion: boolean
  noGarlic: boolean
  additionalRestrictions: string
}

export type PantryItem = {
  id: string
  name: string
  quantity: number
  unit: string
  boughtAt: string
  availableForPlanning: boolean
}

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

type Props = {
  householdId: string
  weekStart: string
  days: WeeklyMealDay[]
  pantry: PantryItem[]
  dateRestrictions: DateRestriction[]
  recipes: WeeklyRecipe[]
  loading: boolean

  onWeekChange: (weekStart: string) => void

  onToggleDateRestriction: (
    date: string,
    key: "noOnion" | "noGarlic",
    value: boolean,
  ) => void

  onChangeAdditionalRestriction: (
    date: string,
    value: string,
  ) => Promise<void>

  onTogglePantry: (
    id: string,
    available: boolean,
  ) => void

  onGenerate: () => void

  onRegenerateDay: (
    day: WeeklyMealDay,
  ) => void

  onMarkCooked: (
    day: WeeklyMealDay,
  ) => void

  onChangeMeal: (
    day: WeeklyMealDay,
    actualGravyRecipeId: string | null,
    actualPoriyalRecipeId: string | null,
    actualMealNote: string | null,
  ) => void

  generating: boolean
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function toLocalDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(dateString: string, amount: number) {
  const date = parseLocalDate(dateString)
  date.setDate(date.getDate() + amount)
  return toLocalDateString(date)
}

function formatWeekDate(dateString: string) {
  return parseLocalDate(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}

function getWeekDates(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  )
}

function getDayName(dateString: string) {
  return parseLocalDate(dateString).toLocaleDateString("en-US", {
    weekday: "long",
  })
}

function getRestriction(
  restrictions: DateRestriction[],
  date: string,
) {
  return (
    restrictions.find(
      (item) => item.date === date,
    ) ?? {
      date,
      noOnion: false,
      noGarlic: false,
      additionalRestrictions: "",
    }
  )
}

export function MealPlanner({
  weekStart,
  days,
  pantry,
  dateRestrictions,
  recipes,
  loading,
  onWeekChange,
  onToggleDateRestriction,
  onChangeAdditionalRestriction,
  onTogglePantry,
  onGenerate,
  onRegenerateDay,
  onMarkCooked,
  onChangeMeal,
  generating,
}: Props) {
  const weekDates = useMemo(
    () => getWeekDates(weekStart),
    [weekStart],
  )

  const [expandedDays, setExpandedDays] =
    useState<Record<string, boolean>>({})
  const [openRestrictionDays, setOpenRestrictionDays] =
    useState<Record<string, boolean>>({})
  const [additionalRestrictionDrafts, setAdditionalRestrictionDrafts] =
    useState<Record<string, string>>({})

  const previousGenerating = useRef(false)

  useEffect(() => {
    if (previousGenerating.current && !generating && days.length === 7) {
      setOpenRestrictionDays({})
    }

    previousGenerating.current = generating
  }, [generating, days.length])

  useEffect(() => {
    setOpenRestrictionDays({})
  }, [weekStart])

  const [editingDayId, setEditingDayId] =
    useState<string | null>(null)

  const [actualGravy, setActualGravy] =
    useState("")

  const [actualPoriyal, setActualPoriyal] =
    useState("")

  const [actualNote, setActualNote] =
    useState("")

  const recipeMap = useMemo(
    () =>
      new Map(
        recipes.map((recipe) => [
          recipe.id,
          recipe,
        ]),
      ),
    [recipes],
  )

  const selectedPantry = pantry.filter(
    (item) =>
      item.availableForPlanning,
  )

  const hasPlan = days.length === 7

  function toggleDay(date: string) {
    setExpandedDays((current) => ({
      ...current,
      [date]: !current[date],
    }))
  }

  function startEditing(
    day: WeeklyMealDay,
  ) {
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

    setActualNote(
      day.actualMealNote ?? "",
    )
  }

  function saveActualMeal(
    day: WeeklyMealDay,
  ) {
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

  return (
    <section className="flex flex-col gap-5">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Meal Plan
          </p>

          <h1 className="text-2xl font-bold tracking-tight">
            {formatWeekDate(weekStart)} –{" "}
            {formatWeekDate(
              weekDates[6],
            )}
          </h1>
        </div>
      </div>

      {/* WEEK NAVIGATION */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() =>
            onWeekChange(addDays(weekStart, -7))
          }
        >
          <ChevronLeft className="mr-1 size-4" />
          Previous week
        </Button>

        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() =>
            onWeekChange(addDays(weekStart, 7))
          }
        >
          Next week
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>

      <div>
        <div className="mb-2">
          <h2 className="text-base font-semibold">
            Specific days
          </h2>

          <p className="text-xs text-muted-foreground">
            Set restrictions or ingredients that cannot be used on a specific day.
            They are applied when generating or regenerating that day.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {weekDates.map((date) => {
            const day = days.find(
              (item) =>
                item.dayDate === date,
            )

            const restriction =
              getRestriction(
                dateRestrictions,
                date,
              )

            const expanded =
              expandedDays[date] ?? true

            const plannedGravy =
              day?.gravyRecipeId
                ? recipeMap.get(
                    day.gravyRecipeId,
                  )
                : null

            const plannedPoriyal =
              day?.poriyalRecipeId
                ? recipeMap.get(
                    day.poriyalRecipeId,
                  )
                : null

            const actualGravyRecipe =
              day?.actualGravyRecipeId
                ? recipeMap.get(
                    day.actualGravyRecipeId,
                  )
                : null

            const actualPoriyalRecipe =
              day?.actualPoriyalRecipeId
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

            const completed = Boolean(
              day?.completedAt,
            )

            const editing =
              day?.id === editingDayId

            return (
              <Card
                key={date}
                className={
                  completed
                    ? "opacity-60"
                    : ""
                }
              >
                <div className="flex w-full items-center gap-1 p-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      toggleDay(date)
                    }
                  >
                    <p
                      className={`text-sm font-bold uppercase tracking-wide ${
                        completed
                          ? "line-through"
                          : "text-primary"
                      }`}
                    >
                      {getDayName(date)}{" "}
                      {formatWeekDate(date)}
                    </p>

                    {(restriction.noOnion ||
                      restriction.noGarlic ||
                      restriction.additionalRestrictions?.trim()) && (
                      <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                        {[
                          restriction.noOnion ? "No onion" : "",
                          restriction.noGarlic ? "No garlic" : "",
                          restriction.additionalRestrictions?.trim() || "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </button>

                  <button
                    type="button"
                    title="Day restrictions"
                    aria-label={`Open restrictions for ${getDayName(date)}`}
                    aria-expanded={Boolean(openRestrictionDays[date])}
                    onClick={() =>
                      setOpenRestrictionDays((current) => ({
                        ...current,
                        [date]: !current[date],
                      }))
                    }
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      openRestrictionDays[date]
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground"
                    }`}
                  >
                    <SlidersHorizontal className="size-4" />
                  </button>

                  <button
                    type="button"
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${getDayName(date)}`}
                    onClick={() =>
                      toggleDay(date)
                    }
                    className="flex size-9 shrink-0 items-center justify-center"
                  >
                    <ChevronDown
                      className={`size-5 transition-transform ${
                        expanded
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>
                </div>

                {openRestrictionDays[date] && (
                  <div className="border-t px-4 pb-4 pt-3">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <div>
                        <p className="text-xs font-semibold">
                          Restrictions for this day
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Select anything that should not be used for this date.
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onToggleDateRestriction(
                              date,
                              "noOnion",
                              !restriction.noOnion,
                            )
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                            restriction.noOnion
                              ? "bg-primary text-primary-foreground"
                              : "bg-background"
                          }`}
                        >
                          {restriction.noOnion ? "✓ No onion" : "No onion"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onToggleDateRestriction(
                              date,
                              "noGarlic",
                              !restriction.noGarlic,
                            )
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                            restriction.noGarlic
                              ? "bg-primary text-primary-foreground"
                              : "bg-background"
                          }`}
                        >
                          {restriction.noGarlic ? "✓ No garlic" : "No garlic"}
                        </button>
                      </div>

                      <div className="mt-3">
                        <label
                          htmlFor={`additional-restrictions-${date}`}
                          className="mb-1 block text-xs font-semibold"
                        >
                          Other restrictions / unavailable ingredients
                        </label>
                        <textarea
                          id={`additional-restrictions-${date}`}
                          value={
                            additionalRestrictionDrafts[date] ??
                            restriction.additionalRestrictions
                          }
                          onChange={(event) =>
                            setAdditionalRestrictionDrafts((current) => ({
                              ...current,
                              [date]: event.target.value,
                            }))
                          }
                          onBlur={(event) =>
                            onChangeAdditionalRestriction(
                              date,
                              event.target.value,
                            )
                          }
                          placeholder="e.g. No tomato, no coconut, or avoid potatoes today"
                          className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Use this for ingredients that have run out or anything else that should not be used that day.
                        </p>
                      </div>

                      <p className="mt-2 text-[11px] text-muted-foreground">
                        These settings apply only to this date.
                      </p>
                    </div>
                  </div>
                )}

                {expanded && (
                  <CardContent className="space-y-4 border-t pt-4">
                    {/* MEAL */}
                    {day ? (
                      <>
                        {!editing ? (
                          <>
                            <div
                              className={
                                completed
                                  ? "line-through"
                                  : ""
                              }
                            >
                              {displayGravy && (
                                <p className="text-base font-semibold">
                                  {
                                    displayGravy.name
                                  }
                                </p>
                              )}

                              {displayPoriyal && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {
                                    displayPoriyal.name
                                  }
                                </p>
                              )}
                            </div>

                            {!completed && (
                              <>
                                {day.breakfastNote && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-semibold">
                                      Breakfast:
                                    </span>{" "}
                                    {
                                      day.breakfastNote
                                    }
                                  </p>
                                )}

                                {day.dinnerNote && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-semibold">
                                      Dinner:
                                    </span>{" "}
                                    {
                                      day.dinnerNote
                                    }
                                  </p>
                                )}
                              </>
                            )}

                            {day.reason && (
                              <p className="text-xs text-muted-foreground">
                                {day.reason}
                              </p>
                            )}

                            {day.warnings &&
                              day.warnings.length >
                                0 && (
                                <div className="rounded-lg bg-secondary p-3">
                                  {day.warnings.map(
                                    (
                                      warning,
                                      index,
                                    ) => (
                                      <p
                                        key={
                                          index
                                        }
                                        className="text-xs text-muted-foreground"
                                      >
                                        {warning}
                                      </p>
                                    ),
                                  )}
                                </div>
                              )}

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                disabled={
                                  generating
                                }
                                onClick={async () => {
                                  const draft =
                                    additionalRestrictionDrafts[date] ??
                                    restriction.additionalRestrictions

                                  if (draft !== restriction.additionalRestrictions) {
                                    await onChangeAdditionalRestriction(
                                      date,
                                      draft,
                                    )
                                  }

                                  await onRegenerateDay(day)
                                }}
                              >
                                <RefreshCw className="mr-1.5 size-4" />
                                Regenerate day with these restrictions
                              </Button>

                              {!completed && (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() =>
                                    onMarkCooked(
                                      day,
                                    )
                                  }
                                >
                                  Mark cooked
                                </Button>
                              )}
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="w-full"
                              onClick={() =>
                                startEditing(
                                  day,
                                )
                              }
                            >
                              Change actual meal
                            </Button>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label
                                className="mb-1 block text-xs font-semibold"
                                htmlFor={`actual-gravy-${day.id}`}
                              >
                                Actual gravy
                              </label>

                              <select
                                id={`actual-gravy-${day.id}`}
                                value={
                                  actualGravy
                                }
                                onChange={(event) =>
                                  setActualGravy(
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                              >
                                <option value="">
                                  No gravy
                                </option>

                                {recipes
                                  .filter(
                                    (
                                      recipe,
                                    ) =>
                                      recipe.type ===
                                      "gravy",
                                  )
                                  .map(
                                    (
                                      recipe,
                                    ) => (
                                      <option
                                        key={
                                          recipe.id
                                        }
                                        value={
                                          recipe.id
                                        }
                                      >
                                        {
                                          recipe.name
                                        }
                                      </option>
                                    ),
                                  )}
                              </select>
                            </div>

                            <div>
                              <label
                                className="mb-1 block text-xs font-semibold"
                                htmlFor={`actual-poriyal-${day.id}`}
                              >
                                Actual poriyal
                              </label>

                              <select
                                id={`actual-poriyal-${day.id}`}
                                value={
                                  actualPoriyal
                                }
                                onChange={(event) =>
                                  setActualPoriyal(
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                              >
                                <option value="">
                                  No poriyal
                                </option>

                                {recipes
                                  .filter(
                                    (
                                      recipe,
                                    ) =>
                                      recipe.type ===
                                      "poriyal",
                                  )
                                  .map(
                                    (
                                      recipe,
                                    ) => (
                                      <option
                                        key={
                                          recipe.id
                                        }
                                        value={
                                          recipe.id
                                        }
                                      >
                                        {
                                          recipe.name
                                        }
                                      </option>
                                    ),
                                  )}
                              </select>
                            </div>

                            <textarea
                              value={actualNote}
                              onChange={(event) =>
                                setActualNote(
                                  event.target
                                    .value,
                                )
                              }
                              placeholder="Something else / note"
                              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                            />

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                className="flex-1"
                                onClick={() =>
                                  saveActualMeal(
                                    day,
                                  )
                                }
                              >
                                Save actual meal
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  setEditingDayId(
                                    null,
                                  )
                                }
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No meal planned yet.
                      </p>
                    )}

                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* PANTRY */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Pantry for planning
          </CardTitle>

          <p className="text-xs text-muted-foreground">
            Checked ingredients are already
            available at home. Gemini will prefer
            them and list additional ingredients
            needed for the week.
          </p>
        </CardHeader>

        <CardContent>
          {pantry.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your pantry is empty. Add ingredients
              from the Pantry tab.
            </p>
          ) : (
            <div className="space-y-2">
              {pantry.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <input
                    type="checkbox"
                    checked={
                      item.availableForPlanning
                    }
                    onChange={(event) =>
                      onTogglePantry(
                        item.id,
                        event.target.checked,
                      )
                    }
                    className="size-4"
                  />

                  <span className="flex-1 text-sm">
                    {item.name}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {item.quantity}{" "}
                    {item.unit}
                  </span>
                </label>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs font-semibold text-muted-foreground">
            {selectedPantry.length} selected
          </p>
        </CardContent>
      </Card>

      {/* GENERATE */}
      <Button
        type="button"
        size="lg"
        className="w-full rounded-xl"
        disabled={generating}
        onClick={() => {
          setOpenRestrictionDays({})
          onGenerate()
        }}
      >
        <Sparkles className="mr-2 size-4" />

        {generating
          ? "Generating meal plan…"
          : hasPlan
            ? "Regenerate Entire Week"
            : "Generate This Week's Plan"}
      </Button>

      {hasPlan && (
        <p className="text-center text-xs text-muted-foreground">
          Regenerating the week changes planned
          meals but keeps actual meals and completed
          status.
        </p>
      )}
    </section>
  )
}
