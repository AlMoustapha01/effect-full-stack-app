import { createServerFn } from "@tanstack/react-start"
import { Schema } from "effect"
import { requireAuth } from "@/features/auth/server/middleware"
import { runServer } from "@/shared/server/runtime"
import { toggleTodo } from "../application/toggle-todo"
import { ToggleTodoInput } from "../domain/todo"

export const toggleTodoFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(Schema.standardSchemaV1(ToggleTodoInput))
  .handler(({ data, context }) => runServer(toggleTodo(data, context.user.id)))
