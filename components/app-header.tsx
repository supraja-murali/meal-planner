export function AppHeader() {
  return (
    <header className="flex flex-col gap-1 pt-2 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Namma Saapadu <span aria-hidden="true">🍛</span>
      </h1>
      <p className="text-pretty text-sm text-muted-foreground">Your intelligent Indian vegetarian meal planner</p>
    </header>
  )
}
