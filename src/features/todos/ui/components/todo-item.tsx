import { Button } from "@/components/ui/button"
import { useDeleteTodo, useToggleTodo } from "../hooks/use-todos"

interface TodoItemProps {
  id: string
  title: string
  completed: boolean
}

export function TodoItem({ id, title, completed }: TodoItemProps) {
  const toggle = useToggleTodo()
  const remove = useDeleteTodo()

  return (
    <li
      className="flex items-center gap-3 border-b border-border py-2"
      data-testid="todo-item"
      data-completed={completed}
    >
      <input
        type="checkbox"
        checked={completed}
        onChange={() => toggle.mutate(id)}
        className="size-4"
        aria-label={`Toggle ${title}`}
      />
      <span
        className={
          completed ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"
        }
      >
        {title}
      </span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => remove.mutate(id)}
        disabled={remove.isPending}
      >
        Delete
      </Button>
    </li>
  )
}
