import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { authClient } from "@/features/auth/client"
import { TodoForm } from "@/features/todos/ui/components/todo-form"
import { TodoList } from "@/features/todos/ui/components/todo-list"

export const Route = createFileRoute("/todos")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data) throw redirect({ to: "/sign-in" })
    return { user: data.user }
  },
  component: TodosPage,
})

function TodosPage() {
  const { user } = Route.useRouteContext()
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.invalidate()
    router.navigate({ to: "/sign-in" })
  }

  return (
    <main className="container mx-auto flex min-h-svh max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Todos</h1>
          <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </header>
      <TodoForm />
      <TodoList />
    </main>
  )
}
