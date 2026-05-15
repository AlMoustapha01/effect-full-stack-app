import { Effect } from "effect"
import { TodosRepository } from "../infrastructure/todos-repository"
import type { CreateTodoInput } from "../domain/todo"

export const createTodo = (input: CreateTodoInput, userId: string) =>
  Effect.gen(function* () {
    const repo = yield* TodosRepository
    return yield* repo.create({ userId, title: input.title })
  })
