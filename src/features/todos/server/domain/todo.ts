import { Schema } from "effect"

// Domain entity as a plain Struct (not Schema.Class) so instances are
// JSON-serialisable values that cross the server-fn boundary without an
// explicit encode step. If you need methods/identity on an entity, prefer
// a Schema.Class and call `Schema.encodeSync(...)` at the .fn.ts boundary.
export const Todo = Schema.Struct({
  id: Schema.UUID,
  userId: Schema.NonEmptyString,
  title: Schema.NonEmptyString.pipe(Schema.maxLength(200)),
  completed: Schema.Boolean,
  // In-memory entities carry real `Date` objects (returned by Drizzle).
  // `Schema.DateFromSelf` validates `instanceof Date`; reserve `Schema.Date`
  // (string ↔ Date transform) for wire DTOs if you ever introduce them.
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
})
export type Todo = typeof Todo.Type

export const CreateTodoInput = Schema.Struct({
  title: Schema.NonEmptyString.pipe(Schema.maxLength(200)),
})
export type CreateTodoInput = typeof CreateTodoInput.Type

export const ToggleTodoInput = Schema.Struct({ id: Schema.UUID })
export type ToggleTodoInput = typeof ToggleTodoInput.Type

export const DeleteTodoInput = Schema.Struct({ id: Schema.UUID })
export type DeleteTodoInput = typeof DeleteTodoInput.Type
