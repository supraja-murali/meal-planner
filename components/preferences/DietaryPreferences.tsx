"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { SlidersHorizontal, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { getHouseholdPreferences, updateDietaryToggle } from "@/lib/supabase/queries"
import type { HouseholdPreferences, DietaryToggleKey } from "@/types/preferences"

const toggles: { key: DietaryToggleKey; label: string }[] = [
  { key: "onion_allowed", label: "Onion" },
  { key: "garlic_allowed", label: "Garlic" },
  { key: "egg_allowed", label: "Egg" },
  { key: "meat_allowed", label: "Meat" },
]

export function DietaryPreferences() {
  const { data, error, isLoading, mutate } = useSWR<HouseholdPreferences>(
    "household_preferences",
    getHouseholdPreferences,
  )
  const [pending, setPending] = useState<DietaryToggleKey | null>(null)

  async function handleToggle(key: DietaryToggleKey, value: boolean) {
    if (!data) return
    setPending(key)

    // Optimistic update
    const optimistic = { ...data, [key]: value }
    mutate(optimistic, false)

    try {
      await updateDietaryToggle(data.id, key, value)
      await mutate()
    } catch {
      toast.error("Couldn't save that change. Please try again.")
      mutate(data, false)
    } finally {
      setPending(null)
    }
  }

  return (
    <section aria-labelledby="preferences-heading">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle id="preferences-heading" className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="size-5 text-primary" aria-hidden="true" />
            Dietary preferences
          </CardTitle>
          <CardDescription>Ingredients allowed in meals</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {error && !isLoading && (
            <div className="col-span-2 flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-5 text-center">
              <p className="text-sm font-medium text-destructive">Couldn&apos;t load your preferences.</p>
              <button
                type="button"
                onClick={() => mutate()}
                className="text-sm font-medium text-primary underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {(isLoading || (!data && !error)) &&
            toggles.map(({ key }) => (
              <div
                key={key}
                className="h-[52px] animate-pulse rounded-xl border border-border bg-secondary/50"
                aria-hidden="true"
              />
            ))}

          {data &&
            !error &&
            toggles.map(({ key, label }) => (
              <label
                key={key}
                htmlFor={`pref-${key}`}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 px-3.5 py-3 text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  {label}
                  {pending === key && (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                  )}
                </span>
                <Switch
                  id={`pref-${key}`}
                  checked={data[key]}
                  onCheckedChange={(value) => handleToggle(key, value)}
                  aria-label={label}
                />
              </label>
            ))}
        </CardContent>
      </Card>
    </section>
  )
}
