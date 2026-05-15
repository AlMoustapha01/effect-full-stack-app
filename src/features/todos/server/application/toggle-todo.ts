import { Effect } from "effect"
import { TodosRepository } from "../infrastructure/todos-repository"
import type { ToggleTodoInput } from "../domain/todo"

export const toggleTodo = (input: ToggleTodoInput, userId: string) =>
  Effect.gen(function* () {
    const repo = yield* TodosRepository
    return yield* repo.toggle({ id: input.id, userId })
  })
