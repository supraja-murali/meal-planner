import { Card, CardContent } from "@/components/ui/card"
import { Beef, Wheat } from "lucide-react"

type Target = {
  icon: typeof Beef
  label: string
  value: string
  hint: string
  accentClass: string
}

const targets: Target[] = [
  {
    icon: Bean,
    label: "Protein",
    value: "90–100 g",
    hint: "per person / day",
    accentClass: "bg-primary/10 text-primary",
  },
  {
    icon: Wheat,
    label: "Fibre",
    value: "≥ 30 g",
    hint: "per person / day",
    accentClass: "bg-accent text-accent-foreground",
  },
]

export function NutritionTargetCard() {
  return (
    <section aria-labelledby="nutrition-heading">
      <h2 id="nutrition-heading" className="mb-3 px-1 text-sm font-semibold text-muted-foreground">
        Daily nutrition target
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {targets.map((target) => {
          const Icon = target.icon
          return (
            <Card key={target.label} className="overflow-hidden border-border/70">
              <CardContent className="flex flex-col gap-2 p-4">
                <span
                  className={`flex size-9 items-center justify-center rounded-full ${target.accentClass}`}
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{target.label}</p>
                  <p className="text-2xl font-bold leading-tight text-foreground">{target.value}</p>
                  <p className="text-xs text-muted-foreground">{target.hint}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
