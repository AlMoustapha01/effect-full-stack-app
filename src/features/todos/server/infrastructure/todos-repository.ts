import { Context, Effect, Layer } from "effect"
import { and, desc, eq } from "drizzle-orm"
import { Database } from "@/shared/server/db"
import { DatabaseError, NotFoundError } from "@/shared/server/errors"
import { Todo } from "../domain/todo"
import { todo } from "../schema"

export interface TodosRepositoryShape {
  readonly findAllByUser: (userId: string) => Effect.Effect<ReadonlyArray<Todo>, DatabaseError>
  readonly create: (input: { userId: string; title: string }) => Effect.Effect<Todo, DatabaseError>
  readonly toggle: (input: {
    id: string
    userId: string
  }) => Effect.Effect<Todo, NotFoundError | DatabaseError>
  readonly remove: (input: {
    id: string
    userId: string
  }) => Effect.Effect<void, NotFoundError | DatabaseError>
}

export class TodosRepository extends Context.Tag("TodosRepository")<
  TodosRepository,
  TodosRepositoryShape
>() {}

const toDomain = (row: typeof todo.$inferSelect): Todo => ({
  id: row.id,
  userId: row.userId,
  title: row.title,
  completed: row.completed,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

export const TodosRepositoryLive = Layer.effect(
  TodosRepository,
  Effect.gen(function* () {
    const db = yield* Database

    return TodosRepository.of({
      findAllByUser: (userId) =>
        Effect.tryPromise({
          try: () =>
            db.select().from(todo).where(eq(todo.userId, userId)).orderBy(desc(todo.createdAt)),
          catch: (cause) => new DatabaseError({ cause }),
        }).pipe(Effect.map((rows) => rows.map(toDomain))),

      create: ({ userId, title }) =>
        Effect.tryPromise({
          try: () =>
            db
              .insert(todo)
              .values({ userId, title })
              .returning()
              .then((r) => r[0]),
          catch: (cause) => new DatabaseError({ cause }),
        }).pipe(Effect.map(toDomain)),

      toggle: ({ id, userId }) =>
        Effect.gen(function* () {
          const existing = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(todo)
                .where(and(eq(todo.id, id), eq(todo.userId, userId)))
                .limit(1),
            catch: (cause) => new DatabaseError({ cause }),
          })
          const row = existing[0]
          if (!row) return yield* Effect.fail(new NotFoundError({ resource: "Todo", id }))
          const updated = yield* Effect.tryPromise({
            try: () =>
              db
                .update(todo)
                .set({ completed: !row.completed, updatedAt: new Date() })
                .where(eq(todo.id, id))
                .returning(),
            catch: (cause) => new DatabaseError({ cause }),
          })
          return toDomain(updated[0])
        }),

      remove: ({ id, userId }) =>
        Effect.tryPromise({
          try: () =>
            db
              .delete(todo)
              .where(and(eq(todo.id, id), eq(todo.userId, userId)))
              .returning({ id: todo.id }),
          catch: (cause) => new DatabaseError({ cause }),
        }).pipe(
          Effect.flatMap((rows) =>
            rows.length === 0
              ? Effect.fail(new NotFoundError({ resource: "Todo", id }))
              : Effect.void
          )
        ),
    })
  })
)
