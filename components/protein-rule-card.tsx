import { Card, CardContent } from "@/components/ui/card"
import { Info } from "lucide-react"

export function ProteinRuleCard() {
  return (
    <section aria-labelledby="protein-rule-heading">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 p-4">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
            aria-hidden="true"
          >
            <Info className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="protein-rule-heading" className="text-sm font-semibold text-foreground">
              Protein balancing rule
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The meal planner will avoid combining a major legume-based dish with a tofu/soy-based dish on the same
              day.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
