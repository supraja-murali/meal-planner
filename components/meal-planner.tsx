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

export type LunchStyle =
  | "gravy_poriyal"
  | "dry_rice"
  | "planner_choice"

export type DateRestriction = {
  date: string
  noOnion: boolean
  noGarlic: boolean
  additionalRestrictions: string
  pantryOnly: boolean
  lunchStyle: LunchStyle
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
  type: "gravy" | "poriyal" | "dry_rice" | "other"
}

export type WeeklyMealDay = {
  id: string
  dayDate: string
  lunchStyle: LunchStyle
  mainRecipeId: string | null
  actualMainRecipeId: string | null
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
  onChangeDatePlanning: (
    date: string,
    key: "pantryOnly" | "lunchStyle",
    value: boolean | LunchStyle,
  ) => Promise<void>
  onTogglePantry: (id: string, available: boolean) => void
  onGenerate: () => void
  onRegenerateDay: (day: WeeklyMealDay) => void
  onMarkCooked: (day: WeeklyMealDay) => void
  onChangeMeal: (
    day: WeeklyMealDay,
    actualMainRecipeId: string | null,
    actualGravyRecipeId: string | null,
    actualPoriyalRecipeId: string | null,
    actualMealNote: string | null,
    breakfastNote: string | null,
    dinnerNote: string | null,
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
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}

function getDayName(dateString: string) {
  return parseLocalDate(dateString).toLocaleDateString("en-US", {
    weekday: "long",
  })
}

function getRestriction(
  restrictions: DateRestriction[],
  date: string,
): DateRestriction {
  return (
    restrictions.find((item) => item.date === date) ?? {
      date,
      noOnion: false,
      noGarlic: false,
      additionalRestrictions: "",
      pantryOnly: false,
      lunchStyle: "planner_choice",
    }
  )
}

function lunchStyleLabel(style: LunchStyle) {
  if (style === "gravy_poriyal") return "Gravy + poriyal"
  if (style === "dry_rice") return "Dry rice"
  return "Let planner decide"
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
  onChangeDatePlanning,
  onTogglePantry,
  onGenerate,
  onRegenerateDay,
  onMarkCooked,
  onChangeMeal,
  generating,
}: Props) {
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})
  const [openRestrictionDays, setOpenRestrictionDays] = useState<Record<string, boolean>>({})
  const [additionalRestrictionDrafts, setAdditionalRestrictionDrafts] = useState<Record<string, string>>({})
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [actualGravy, setActualGravy] = useState("")
  const [actualPoriyal, setActualPoriyal] = useState("")
  const [actualNote, setActualNote] = useState("")
  const [breakfastNote, setBreakfastNote] = useState("")
  const [dinnerNote, setDinnerNote] = useState("")
  const previousGenerating = useRef(false)

  useEffect(() => {
    if (previousGenerating.current && !generating && days.length === 7) {
      setOpenRestrictionDays({})
    }
    previousGenerating.current = generating
  }, [generating, days.length])

  useEffect(() => {
    setOpenRestrictionDays({})
    setAdditionalRestrictionDrafts({})
  }, [weekStart])

  const recipeMap = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  )

  const selectedPantry = pantry.filter((item) => item.availableForPlanning)
  const hasPlan = days.length === 7

  function toggleDay(date: string) {
    setExpandedDays((current) => ({ ...current, [date]: !current[date] }))
  }

  function startEditing(day: WeeklyMealDay) {
    setEditingDayId(day.id)
    setActualGravy(day.actualGravyRecipeId ?? day.gravyRecipeId ?? day.mainRecipeId ?? "")
    setActualPoriyal(day.actualPoriyalRecipeId ?? day.poriyalRecipeId ?? "")
    setActualNote(day.actualMealNote ?? "")
    setBreakfastNote(day.breakfastNote ?? "")
    setDinnerNote(day.dinnerNote ?? "")
  }

  function saveActualMeal(day: WeeklyMealDay) {
    const actualMain =
      day.lunchStyle === "dry_rice"
        ? actualGravy || null
        : null

    onChangeMeal(
      day,
      actualMain,
      day.lunchStyle === "dry_rice" ? null : actualGravy || null,
      actualPoriyal || null,
      actualNote.trim() || null,
      breakfastNote.trim() || null,
      dinnerNote.trim() || null,
    )
    setEditingDayId(null)
    setActualGravy("")
    setActualPoriyal("")
    setActualNote("")
    setBreakfastNote("")
    setDinnerNote("")
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">Meal Plan</p>
        <h1 className="text-2xl font-bold tracking-tight">
          {formatWeekDate(weekStart)} – {formatWeekDate(weekDates[6])}
        </h1>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => onWeekChange(addDays(weekStart, -7))}>
          <ChevronLeft className="mr-1 size-4" /> Previous week
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={() => onWeekChange(addDays(weekStart, 7))}>
          Next week <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>

      <div>
        <div className="mb-2">
          <h2 className="text-base font-semibold">Specific days</h2>
          <p className="text-xs text-muted-foreground">
            Each day can have its own restrictions, pantry mode and lunch style.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {weekDates.map((date) => {
            const day = days.find((item) => item.dayDate === date)
            const restriction = getRestriction(dateRestrictions, date)
            const expanded = expandedDays[date] ?? true
            const restrictionOpen = Boolean(openRestrictionDays[date])

            const plannedMain = day?.mainRecipeId ? recipeMap.get(day.mainRecipeId) : null
            const plannedGravy = day?.gravyRecipeId ? recipeMap.get(day.gravyRecipeId) : null
            const plannedPoriyal = day?.poriyalRecipeId ? recipeMap.get(day.poriyalRecipeId) : null
            const actualGravyRecipe = day?.actualGravyRecipeId ? recipeMap.get(day.actualGravyRecipeId) : null
            const actualPoriyalRecipe = day?.actualPoriyalRecipeId ? recipeMap.get(day.actualPoriyalRecipeId) : null
            const completed = Boolean(day?.completedAt)
            const editing = day?.id === editingDayId
            const restrictionSummary = [
              restriction.noOnion ? "No onion" : "",
              restriction.noGarlic ? "No garlic" : "",
              restriction.additionalRestrictions.trim(),
              restriction.pantryOnly ? "Pantry only" : "",
              restriction.lunchStyle !== "planner_choice" ? lunchStyleLabel(restriction.lunchStyle) : "",
            ].filter(Boolean).join(" · ")

            return (
              <Card key={date} className={completed ? "opacity-60" : ""}>
                <div className="flex w-full items-center gap-1 p-4">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => toggleDay(date)}>
                    <p className={`text-sm font-bold uppercase tracking-wide ${completed ? "line-through" : "text-primary"}`}>
                      {getDayName(date)} {formatWeekDate(date)}
                    </p>
                    {restrictionSummary && (
                      <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{restrictionSummary}</p>
                    )}
                  </button>

                  <button
                    type="button"
                    title="Day planning settings"
                    aria-label={`Open planning settings for ${getDayName(date)}`}
                    aria-expanded={restrictionOpen}
                    onClick={() => setOpenRestrictionDays((current) => ({ ...current, [date]: !current[date] }))}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors ${restrictionOpen ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                  >
                    <SlidersHorizontal className="size-4" />
                  </button>

                  <button type="button" aria-label={`${expanded ? "Collapse" : "Expand"} ${getDayName(date)}`} onClick={() => toggleDay(date)} className="flex size-9 shrink-0 items-center justify-center">
                    <ChevronDown className={`size-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {restrictionOpen && (
                  <div className="border-t px-4 pb-4 pt-3">
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-4">
                      <div>
                        <p className="text-xs font-semibold">Day planning settings</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">These settings apply only to this date and are used when generating or regenerating it.</p>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold">Ingredient availability</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => void onChangeDatePlanning(date, "pantryOnly", true)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${restriction.pantryOnly ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                            ✓ Pantry only
                          </button>
                          <button type="button" onClick={() => void onChangeDatePlanning(date, "pantryOnly", false)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${!restriction.pantryOnly ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                            Pantry + buy
                          </button>
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {restriction.pantryOnly
                            ? `Only the ${selectedPantry.length} ingredients currently marked available in Pantry may be used.`
                            : "Gemini can introduce ingredients that you can buy."}
                        </p>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold">Lunch style</p>
                        <div className="grid grid-cols-1 gap-2">
                          {([
                            ["planner_choice", "Let planner decide"],
                            ["gravy_poriyal", "Gravy + poriyal"],
                            ["dry_rice", "Dry rice"],
                          ] as const).map(([value, label]) => (
                            <button key={value} type="button" onClick={() => void onChangeDatePlanning(date, "lunchStyle", value)} className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${restriction.lunchStyle === value ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                              {restriction.lunchStyle === value ? "✓ " : ""}{label}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">Dry-rice days can use tomato rice, lemon rice, fried rice, coconut rice, tamarind rice and similar dishes instead of forcing a gravy.</p>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold">Restrictions</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => onToggleDateRestriction(date, "noOnion", !restriction.noOnion)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${restriction.noOnion ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                            {restriction.noOnion ? "✓ " : ""}No onion
                          </button>
                          <button type="button" onClick={() => onToggleDateRestriction(date, "noGarlic", !restriction.noGarlic)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${restriction.noGarlic ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                            {restriction.noGarlic ? "✓ " : ""}No garlic
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`additional-restrictions-${date}`} className="mb-1 block text-xs font-semibold">Other restrictions / unavailable ingredients</label>
                        <textarea
                          id={`additional-restrictions-${date}`}
                          value={additionalRestrictionDrafts[date] ?? restriction.additionalRestrictions}
                          onChange={(event) => setAdditionalRestrictionDrafts((current) => ({ ...current, [date]: event.target.value }))}
                          onBlur={(event) => void onChangeAdditionalRestriction(date, event.target.value)}
                          placeholder="e.g. No tomato, no coconut, or avoid potatoes today"
                          className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">Use this for ingredients that have run out or anything else that should not be used that day.</p>
                      </div>

                      {selectedPantry.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-semibold">Available pantry for this day</p>
                          <p className="text-[11px] text-muted-foreground">{selectedPantry.map((item) => item.name).join(", ")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {expanded && (
                  <CardContent className="space-y-4 border-t pt-4">
                    {day ? (
                      <>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lunch</p>
                          {day.lunchStyle === "dry_rice" && plannedMain ? (
                            <p className="text-base font-semibold">{(day.actualMainRecipeId ? recipeMap.get(day.actualMainRecipeId)?.name : null) ?? plannedMain.name}</p>
                          ) : (
                            <>
                              {plannedGravy && <p className="text-base font-semibold">{actualGravyRecipe?.name ?? plannedGravy.name}</p>}
                              {plannedPoriyal && <p className="mt-1 text-sm text-muted-foreground">{actualPoriyalRecipe?.name ?? plannedPoriyal.name}</p>}
                            </>
                          )}
                        </div>

                        {!editing && (
                          <>
                            {day.breakfastNote && <p className="text-xs text-muted-foreground"><span className="font-semibold">Breakfast:</span> {day.breakfastNote}</p>}
                            {day.dinnerNote && <p className="text-xs text-muted-foreground"><span className="font-semibold">Dinner:</span> {day.dinnerNote}</p>}
                          </>
                        )}

                        {day.reason && <p className="text-xs text-muted-foreground">{day.reason}</p>}
                        {day.warnings && day.warnings.length > 0 && (
                          <div className="rounded-lg bg-secondary p-3">{day.warnings.map((warning, index) => <p key={index} className="text-xs text-muted-foreground">{warning}</p>)}</div>
                        )}

                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" className="flex-1" disabled={generating} onClick={() => onRegenerateDay(day)}>
                            <RefreshCw className="mr-1.5 size-4" /> Regenerate day
                          </Button>
                          {!completed && <Button type="button" size="sm" className="flex-1" onClick={() => onMarkCooked(day)}>Mark cooked</Button>}
                        </div>

                        <Button type="button" size="sm" variant="ghost" className="w-full" onClick={() => startEditing(day)}>Edit meals</Button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No meal planned yet.</p>
                    )}

                    {editing && day && (
                      <div className="space-y-4 rounded-lg border p-3">
                        <p className="text-xs font-semibold">Edit this day's meals</p>

                        <div>
                          <label className="mb-1 block text-xs font-semibold" htmlFor={`breakfast-${day.id}`}>Breakfast / tiffin</label>
                          <textarea id={`breakfast-${day.id}`} value={breakfastNote} onChange={(event) => setBreakfastNote(event.target.value)} placeholder="e.g. idli + sambar, vegetable upma, adai" className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold" htmlFor={`dinner-${day.id}`}>Dinner / tiffin</label>
                          <textarea id={`dinner-${day.id}`} value={dinnerNote} onChange={(event) => setDinnerNote(event.target.value)} placeholder="e.g. chapati + kurma, paniyaram, dosa" className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold" htmlFor={`actual-gravy-${day.id}`}>Actual lunch / main</label>
                          <select id={`actual-gravy-${day.id}`} value={actualGravy} onChange={(event) => setActualGravy(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                            <option value="">No gravy / main override</option>
                            {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold" htmlFor={`actual-poriyal-${day.id}`}>Actual poriyal</label>
                          <select id={`actual-poriyal-${day.id}`} value={actualPoriyal} onChange={(event) => setActualPoriyal(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                            <option value="">No poriyal</option>
                            {recipes.filter((recipe) => recipe.type === "poriyal").map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
                          </select>
                        </div>

                        <textarea value={actualNote} onChange={(event) => setActualNote(event.target.value)} placeholder="Something else / lunch note" className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm" />

                        <div className="flex gap-2">
                          <Button type="button" className="flex-1" onClick={() => saveActualMeal(day)}>Save meals</Button>
                          <Button type="button" variant="outline" onClick={() => setEditingDayId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pantry for planning</CardTitle>
          <p className="text-xs text-muted-foreground">Checked ingredients are available at home. Pantry-only days can use only these ingredients; other days may include ingredients to buy.</p>
        </CardHeader>
        <CardContent>
          {pantry.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your pantry is empty. Add ingredients from the Pantry tab.</p>
          ) : (
            <div className="space-y-2">
              {pantry.map((item) => (
                <label key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <input type="checkbox" checked={item.availableForPlanning} onChange={(event) => onTogglePantry(item.id, event.target.checked)} className="size-4" />
                  <span className="flex-1 text-sm">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
                </label>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs font-semibold text-muted-foreground">{selectedPantry.length} selected</p>
        </CardContent>
      </Card>

      <Button type="button" size="lg" className="w-full rounded-xl" disabled={generating} onClick={() => { setOpenRestrictionDays({}); onGenerate() }}>
        <Sparkles className="mr-2 size-4" />
        {generating ? "Generating meal plan…" : hasPlan ? "Regenerate Entire Week" : "Generate This Week's Plan"}
      </Button>

      {hasPlan && <p className="text-center text-xs text-muted-foreground">Regenerating the week changes planned meals but keeps actual meals and completed status.</p>}
    </section>
  )
}
