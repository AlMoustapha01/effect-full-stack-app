import { describe, expect, it } from "vitest"
import { Effect, Layer } from "effect"
import { TodosRepository } from "../server/infrastructure/todos-repository"
import { listTodos } from "../server/application/list-todos"
import { Todo } from "../server/domain/todo"

describe("listTodos", () => {
  it("returns only the todos owned by the user", async () => {
    const userTodos: ReadonlyArray<Todo> = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        userId: "user-1",
        title: "first",
        completed: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ]
    const FakeRepo = Layer.succeed(TodosRepository, {
      findAllByUser: (userId) =>
        userId === "user-1" ? Effect.succeed(userTodos) : Effect.succeed([]),
      create: () => Effect.die("not used"),
      toggle: () => Effect.die("not used"),
      remove: () => Effect.die("not used"),
    })

    const result = await Effect.runPromise(listTodos("user-1").pipe(Effect.provide(FakeRepo)))
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe("first")
  })
})
