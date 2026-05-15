import { describe, expect, it } from "vitest"
import { Effect, Exit, Layer } from "effect"
import { TodosRepository } from "../server/infrastructure/todos-repository"
import { deleteTodo } from "../server/application/delete-todo"
import { NotFoundError } from "@/shared/server/errors"

describe("deleteTodo", () => {
  it("forwards id+userId to repo.remove", async () => {
    let received: { id: string; userId: string } | null = null
    const FakeRepo = Layer.succeed(TodosRepository, {
      findAllByUser: () => Effect.succeed([]),
      create: () => Effect.die("not used"),
      toggle: () => Effect.die("not used"),
      remove: (input) => {
        received = input
        return Effect.void
      },
    })

    await Effect.runPromise(deleteTodo({ id: "todo-1" }, "user-1").pipe(Effect.provide(FakeRepo)))

    expect(received).toEqual({ id: "todo-1", userId: "user-1" })
  })

  it("propagates NotFoundError when the row doesn't exist", async () => {
    const FakeRepo = Layer.succeed(TodosRepository, {
      findAllByUser: () => Effect.succeed([]),
      create: () => Effect.die("not used"),
      toggle: () => Effect.die("not used"),
      remove: ({ id }) => Effect.fail(new NotFoundError({ resource: "Todo", id })),
    })

    const exit = await Effect.runPromiseExit(
      deleteTodo({ id: "todo-1" }, "user-1").pipe(Effect.provide(FakeRepo))
    )

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      const error = exit.cause._tag === "Fail" ? exit.cause.error : null
      expect(error?._tag).toBe("NotFoundError")
    }
  })
})
