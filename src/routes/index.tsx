import { createFileRoute, Link } from "@tanstack/react-router"
import { buttonVariants } from "@/components/ui/button"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  return (
    <main className="container mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Effect Full-Stack Template</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          TanStack Start · Effect TS · Drizzle · better-auth · feature-based
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/sign-up" className={buttonVariants()}>
          Get started
        </Link>
        <Link to="/sign-in" className={buttonVariants({ variant: "outline" })}>
          Sign in
        </Link>
      </div>
    </main>
  )
}
