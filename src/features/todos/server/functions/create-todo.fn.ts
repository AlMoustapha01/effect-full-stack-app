import { createServerFn } from "@tanstack/react-start"
import { Schema } from "effect"
import { requireAuth } from "@/features/auth/server/middleware"
import { runServer } from "@/shared/server/runtime"
import { createTodo } from "../application/create-todo"
import { CreateTodoInput } from "../domain/todo"

export const createTodoFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(Schema.standardSchemaV1(CreateTodoInput))
  .handler(({ data, context }) => runServer(createTodo(data, context.user.id)))
