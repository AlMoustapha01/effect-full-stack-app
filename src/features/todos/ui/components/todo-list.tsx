import { useTodos } from "../hooks/use-todos"
import { TodoItem } from "./todo-item"

export function TodoList() {
  const { data, isLoading, error } = useTodos()

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error) return <p className="text-sm text-destructive">Failed to load todos.</p>
  if (!data || data.length === 0)
    return <p className="text-sm text-muted-foreground">No todos yet — add one above.</p>

  return (
    <ul className="flex w-full flex-col">
      {data.map((todo) => (
        <TodoItem key={todo.id} id={todo.id} title={todo.title} completed={todo.completed} />
      ))}
    </ul>
  )
}
