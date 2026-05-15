import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listTodosFn } from "../../server/functions/list-todos.fn"
import { createTodoFn } from "../../server/functions/create-todo.fn"
import { toggleTodoFn } from "../../server/functions/toggle-todo.fn"
import { deleteTodoFn } from "../../server/functions/delete-todo.fn"

const TODOS_KEY = ["todos"] as const

export function useTodos() {
  return useQuery({
    queryKey: TODOS_KEY,
    queryFn: () => listTodosFn(),
  })
}

export function useCreateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => createTodoFn({ data: { title } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TODOS_KEY }),
  })
}

export function useToggleTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleTodoFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TODOS_KEY }),
  })
}

export function useDeleteTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTodoFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TODOS_KEY }),
  })
}
