"use client"

import {
  CalendarDays,
  KeyRound,
  Settings,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"

type Props = {
  onPlan: () => void
  onSettings: () => void
}

export function PlanMealButton({
  onPlan,
  onSettings,
}: Props) {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        className="h-14 w-full rounded-2xl text-base font-semibold shadow-sm"
        onClick={onPlan}
      >
        <CalendarDays className="mr-2 h-5 w-5" />
        Plan My Week
        <Sparkles className="ml-2 h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onSettings}
      >
        <Settings className="mr-2 h-4 w-4" />
        Gemini AI Settings
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Bring your own Gemini API key
      </p>
    </div>
  )
}