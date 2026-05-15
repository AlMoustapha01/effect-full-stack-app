import { Effect } from "effect"
import { TodosRepository } from "../infrastructure/todos-repository"

export const listTodos = (userId: string) =>
  Effect.gen(function* () {
    const repo = yield* TodosRepository
    return yield* repo.findAllByUser(userId)
  })
