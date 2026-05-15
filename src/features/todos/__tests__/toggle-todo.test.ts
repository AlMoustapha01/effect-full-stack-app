import { describe, expect, it } from "vitest"
import { Effect, Exit, Layer } from "effect"
import { TodosRepository } from "../server/infrastructure/todos-repository"
import { toggleTodo } from "../server/application/toggle-todo"
import { Todo } from "../server/domain/todo"
import { NotFoundError } from "@/shared/server/errors"

const existing: Todo = {
  id: "00000000-0000-0000-0000-000000000001",
  userId: "user-1",
  title: "buy bread",
  completed: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
}

describe("toggleTodo", () => {
  it("forwards id+userId to the repo and returns the flipped todo", async () => {
    let received: { id: string; userId: string } | null = null
    const FakeRepo = Layer.succeed(TodosRepository, {
      findAllByUser: () => Effect.succeed([]),
      create: () => Effect.die("not used"),
      toggle: (input) => {
        received = input
        return Effect.succeed({ ...existing, completed: true })
      },
      remove: () => Effect.die("not used"),
    })

    const result = await Effect.runPromise(
      toggleTodo({ id: existing.id }, "user-1").pipe(Effect.provide(FakeRepo))
    )

    expect(received).toEqual({ id: existing.id, userId: "user-1" })
    expect(result.completed).toBe(true)
  })

  it("propagates NotFoundError when the repo can't find the row", async () => {
    const FakeRepo = Layer.succeed(TodosRepository, {
      findAllByUser: () => Effect.succeed([]),
      create: () => Effect.die("not used"),
      toggle: ({ id }) => Effect.fail(new NotFoundError({ resource: "Todo", id })),
      remove: () => Effect.die("not used"),
    })

    const exit = await Effect.runPromiseExit(
      toggleTodo({ id: existing.id }, "user-1").pipe(Effect.provide(FakeRepo))
    )

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      const error = exit.cause._tag === "Fail" ? exit.cause.error : null
      expect(error?._tag).toBe("NotFoundError")
    }
  })
})
