"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export function PlanMealButton() {
  const [showMessage, setShowMessage] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        className="h-14 w-full rounded-2xl text-base font-semibold shadow-sm"
        onClick={() => setShowMessage(true)}
      >
        <span aria-hidden="true">🍛</span>
        Plan Today&apos;s Meal
      </Button>
      {showMessage && (
        <p
          role="status"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-center text-sm font-medium text-accent-foreground"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Meal planning is coming soon — hang tight!
        </p>
      )}
    </div>
  )
}
