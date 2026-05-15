import { createServerFn } from "@tanstack/react-start"
import { Schema } from "effect"
import { requireAuth } from "@/features/auth/server/middleware"
import { runServer } from "@/shared/server/runtime"
import { deleteTodo } from "../application/delete-todo"
import { DeleteTodoInput } from "../domain/todo"

export const deleteTodoFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(Schema.standardSchemaV1(DeleteTodoInput))
  .handler(({ data, context }) => runServer(deleteTodo(data, context.user.id)))
