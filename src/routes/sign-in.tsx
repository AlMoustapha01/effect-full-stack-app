import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { SignInForm } from "@/features/auth/ui/components/sign-in-form"

export const Route = createFileRoute("/sign-in")({ component: SignInPage })

function SignInPage() {
  const router = useRouter()
  return (
    <main className="container mx-auto flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <header className="flex flex-col items-center gap-1">
        <h1 className="text-xl font-medium">Sign in</h1>
        <p className="text-sm text-muted-foreground">Welcome back.</p>
      </header>
      <SignInForm onSuccess={() => router.navigate({ to: "/todos" })} />
      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/sign-up" className="underline">
          Create an account
        </Link>
      </p>
    </main>
  )
}
