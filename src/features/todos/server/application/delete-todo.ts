import { Effect } from "effect"
import { TodosRepository } from "../infrastructure/todos-repository"
import type { DeleteTodoInput } from "../domain/todo"

export const deleteTodo = (input: DeleteTodoInput, userId: string) =>
  Effect.gen(function* () {
    const repo = yield* TodosRepository
    yield* repo.remove({ id: input.id, userId })
  })
