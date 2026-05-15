import { createServerFn } from "@tanstack/react-start"
import { requireAuth } from "@/features/auth/server/middleware"
import { runServer } from "@/shared/server/runtime"
import { listTodos } from "../application/list-todos"

export const listTodosFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(({ context }) => runServer(listTodos(context.user.id)))
