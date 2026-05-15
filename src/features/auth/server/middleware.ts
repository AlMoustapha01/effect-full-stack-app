import { createMiddleware } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { UnauthorizedError } from "@/shared/server/errors"
import { ServerError } from "@/shared/server/runtime"
import { auth } from "./auth"

/**
 * Server-fn middleware: rejects the call if the request has no valid session.
 * Use in `createServerFn({...}).middleware([requireAuth]).handler(...)`.
 * The handler context exposes `context.user` and `context.session`.
 *
 * Throws the same `ServerError` shape that `runServer` uses for tagged errors,
 * so unauthorised responses are indistinguishable from any other 401 the
 * application produces — single error contract across the boundary.
 */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw new ServerError(new UnauthorizedError({}))
  return next({ context: { user: session.user, session: session.session } })
})
