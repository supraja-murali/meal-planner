import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Soup, Salad, Sun, Moon } from "lucide-react"

const rows = [
  { icon: Soup, title: "1 gravy / day", desc: "A hearty main gravy for the day" },
  { icon: Salad, title: "1 poriyal / day", desc: "A dry vegetable stir-fry side" },
]

export function CookingStructureCard() {
  return (
    <section aria-labelledby="structure-heading">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle id="structure-heading" className="text-base">
            Cooking structure
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {rows.map((row) => {
            const Icon = row.icon
            return (
              <div key={row.title} className="flex items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{row.desc}</p>
                </div>
              </div>
            )
          })}

          <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-3">
            <p className="text-sm text-foreground">
              <span className="font-semibold">Gravy is reusable.</span> Pair the day&apos;s gravy with dosa for both{" "}
              <span className="inline-flex items-center gap-1 align-middle text-muted-foreground">
                <Sun className="size-3.5" aria-hidden="true" /> breakfast
              </span>{" "}
              and{" "}
              <span className="inline-flex items-center gap-1 align-middle text-muted-foreground">
                <Moon className="size-3.5" aria-hidden="true" /> dinner
              </span>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
