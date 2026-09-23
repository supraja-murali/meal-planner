"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { SlidersHorizontal } from "lucide-react"

export type PreferenceKey = "onion" | "garlic" | "egg" | "meat"

const preferenceLabels: { key: PreferenceKey; label: string }[] = [
  { key: "onion", label: "Onion" },
  { key: "garlic", label: "Garlic" },
  { key: "egg", label: "Egg" },
  { key: "meat", label: "Meat" },
]

type DietaryPreferencesProps = {
  preferences: Record<PreferenceKey, boolean>
  onToggle: (key: PreferenceKey, value: boolean) => void
}

export function DietaryPreferences({ preferences, onToggle }: DietaryPreferencesProps) {
  return (
    <section aria-labelledby="preferences-heading">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle id="preferences-heading" className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="size-5 text-primary" aria-hidden="true" />
            Dietary preferences
          </CardTitle>
          <CardDescription>Turn on anything you&apos;d like to allow in your meals.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {preferenceLabels.map(({ key, label }) => (
            <label
              key={key}
              htmlFor={`pref-${key}`}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 px-3.5 py-3 text-sm font-medium"
            >
              {label}
              <Switch
                id={`pref-${key}`}
                checked={preferences[key]}
                onCheckedChange={(value) => onToggle(key, value)}
                aria-label={label}
              />
            </label>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
