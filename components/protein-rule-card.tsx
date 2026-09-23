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
              The upcoming meal planner will avoid stacking major protein sources on the same day — for example, it
              won&apos;t pair a high-legume dish (like a heavy toor dal) with a tofu- or paneer-based dish together. This
              keeps each day balanced and easier to digest.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
