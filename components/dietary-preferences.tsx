"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"

export type PreferenceKey =
  | "onion"
  | "garlic"

export type DateRestriction = {
  date: string
  noOnion: boolean
  noGarlic: boolean
}

type DietaryPreferencesProps = {
  preferences: Record<PreferenceKey, boolean>

  onToggle: (
    key: PreferenceKey,
    value: boolean
  ) => void

  dateRestrictions: DateRestriction[]

  onToggleDateRestriction: (
    date: string,
    key: "noOnion" | "noGarlic",
    value: boolean
  ) => void
}

function formatDate(dateString: string) {
  return new Date(
    `${dateString}T00:00:00`
  ).toLocaleDateString("en-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function DietaryPreferences({
  preferences,
  onToggle,
  dateRestrictions,
  onToggleDateRestriction,
}: DietaryPreferencesProps) {
  const [openDate, setOpenDate] =
    useState<string | null>(null)

  const dates = useMemo(() => {
    const today = new Date()

    const day = today.getDay()

    const mondayOffset =
      day === 0 ? -6 : 1 - day

    const monday = new Date(today)

    monday.setDate(
      today.getDate() + mondayOffset
    )

    monday.setHours(0, 0, 0, 0)

    return Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date(monday)

        date.setDate(
          monday.getDate() + index
        )

        return date
          .toISOString()
          .slice(0, 10)
      }
    )
  }, [])

  function getRestriction(date: string) {
    return (
      dateRestrictions.find(
        (item) => item.date === date
      ) ?? {
        date,
        noOnion: false,
        noGarlic: false,
      }
    )
  }

  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <CalendarDays
              className="size-5"
              aria-hidden="true"
            />
          </div>

          <div>
            <h2 className="text-base font-semibold">
              Dietary preferences
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Set your normal preferences and
              add restrictions for specific days.
            </p>
          </div>
        </div>
      </div>

      {/* General preferences */}
      <div className="border-b border-border px-4 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          General preferences
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              onToggle(
                "onion",
                !preferences.onion
              )
            }
            className={`rounded-lg border px-3 py-3 text-left text-sm ${
              preferences.onion
                ? "border-primary bg-primary/10"
                : "border-border bg-background"
            }`}
          >
            <span className="block font-medium">
              Onion
            </span>

            <span className="mt-0.5 block text-xs text-muted-foreground">
              {preferences.onion
                ? "Allowed"
                : "Usually avoid"}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onToggle(
                "garlic",
                !preferences.garlic
              )
            }
            className={`rounded-lg border px-3 py-3 text-left text-sm ${
              preferences.garlic
                ? "border-primary bg-primary/10"
                : "border-border bg-background"
            }`}
          >
            <span className="block font-medium">
              Garlic
            </span>

            <span className="mt-0.5 block text-xs text-muted-foreground">
              {preferences.garlic
                ? "Allowed"
                : "Usually avoid"}
            </span>
          </button>
        </div>
      </div>

      {/* Date-specific restrictions */}
      <div className="px-4 py-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            This week's restrictions
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            These override your general preferences
            for that day.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {dates.map((date) => {
            const restriction =
              getRestriction(date)

            const hasRestriction =
              restriction.noOnion ||
              restriction.noGarlic

            const isOpen =
              openDate === date

            return (
              <div
                key={date}
                className="rounded-lg border border-border"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenDate(
                      isOpen ? null : date
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatDate(date)}
                    </span>

                    {hasRestriction && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Restricted
                      </span>
                    )}
                  </div>

                  {isOpen ? (
                    <ChevronUp className="size-4 shrink-0" />
                  ) : (
                    <ChevronDown className="size-4 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-border px-3 py-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onToggleDateRestriction(
                            date,
                            "noOnion",
                            !restriction.noOnion
                          )
                        }
                        className={`rounded-lg border px-3 py-2.5 text-left text-sm ${
                          restriction.noOnion
                            ? "border-destructive bg-destructive/10"
                            : "border-border"
                        }`}
                      >
                        <span className="block font-medium">
                          No onion
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {restriction.noOnion
                            ? "Restricted"
                            : "Allowed"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onToggleDateRestriction(
                            date,
                            "noGarlic",
                            !restriction.noGarlic
                          )
                        }
                        className={`rounded-lg border px-3 py-2.5 text-left text-sm ${
                          restriction.noGarlic
                            ? "border-destructive bg-destructive/10"
                            : "border-border"
                        }`}
                      >
                        <span className="block font-medium">
                          No garlic
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {restriction.noGarlic
                            ? "Restricted"
                            : "Allowed"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}