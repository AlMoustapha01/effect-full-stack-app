import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { SignUpForm } from "@/features/auth/ui/components/sign-up-form"

export const Route = createFileRoute("/sign-up")({ component: SignUpPage })

function SignUpPage() {
  const router = useRouter()
  return (
    <main className="container mx-auto flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <header className="flex flex-col items-center gap-1">
        <h1 className="text-xl font-medium">Create your account</h1>
        <p className="text-sm text-muted-foreground">It only takes a second.</p>
      </header>
      <SignUpForm onSuccess={() => router.navigate({ to: "/todos" })} />
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
