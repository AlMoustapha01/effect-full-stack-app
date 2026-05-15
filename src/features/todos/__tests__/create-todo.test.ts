import { describe, expect, it } from "vitest"
import { Effect, Layer } from "effect"
import { TodosRepository } from "../server/infrastructure/todos-repository"
import { createTodo } from "../server/application/create-todo"
import { Todo } from "../server/domain/todo"

const stubTodo = (title: string, userId: string): Todo => ({
  id: "00000000-0000-0000-0000-000000000001",
  userId,
  title,
  completed: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
})

describe("createTodo", () => {
  it("delegates to repository with the right payload", async () => {
    let receivedInput: { userId: string; title: string } | null = null
    const FakeRepo = Layer.succeed(TodosRepository, {
      findAllByUser: () => Effect.succeed([]),
      create: (input) => {
        receivedInput = input
        return Effect.succeed(stubTodo(input.title, input.userId))
      },
      toggle: () => Effect.die("not used"),
      remove: () => Effect.die("not used"),
    })

    const result = await Effect.runPromise(
      createTodo({ title: "Buy bread" }, "user-1").pipe(Effect.provide(FakeRepo))
    )

    expect(receivedInput).toEqual({ userId: "user-1", title: "Buy bread" })
    expect(result.title).toBe("Buy bread")
    expect(result.completed).toBe(false)
  })
})
