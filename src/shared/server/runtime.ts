import { Cause, Effect, Exit, Layer, ManagedRuntime, Option } from "effect"
import { DatabaseLive } from "./db"
import { LoggerLive } from "./logger"
import { TodosRepositoryLive } from "@/features/todos/server/infrastructure/todos-repository"
import { toHttp, type AppError } from "./errors"
import { env } from "./env"

/**
 * Application layer — merge feature Layers here.
 * Every new feature with infrastructure adds its `*Live` Layer below
 * (use `Layer.provide(DatabaseLive)` if the repository depends on `Database`).
 */
export const AppLayer = Layer.mergeAll(
  DatabaseLive,
  LoggerLive,
  TodosRepositoryLive.pipe(Layer.provide(DatabaseLive))
)

type AppEnv = Layer.Layer.Success<typeof AppLayer>

/**
 * Re-export of `Effect.Effect<A, AppError, AppEnv>` for use-case authors.
 * Every use-case (`application/*.ts`) returns this shape; new features should
 * keep their error channel inside `AppError` so `runServer` can map cleanly.
 */
export type AppEffect<A> = Effect.Effect<A, AppError, AppEnv>

const globalForRuntime = globalThis as unknown as {
  __runtime?: ManagedRuntime.ManagedRuntime<AppEnv, never>
}

export const runtime = globalForRuntime.__runtime ?? ManagedRuntime.make(AppLayer)
if (env.NODE_ENV !== "production") globalForRuntime.__runtime = runtime

/**
 * The canonical thrown shape at the server-fn boundary. Carries the HTTP
 * status and the tag of the originating `AppError`. The client receives a
 * normal rejected promise — no fiber-failure or pretty-cause leakage.
 */
export class ServerError extends Error {
  readonly status: number
  readonly code: string
  constructor(error: AppError) {
    const http = toHttp(error)
    super(http.message)
    this.status = http.status
    this.code = http.code
    this.name = "ServerError"
  }
}

/**
 * Run an Effect via the shared runtime and turn the result into a normal
 * Promise<A>. Failure modes:
 *
 *   • Typed failure (`AppError`) → thrown as `ServerError` with the right
 *     HTTP status + code. The client can inspect `error.status` / `error.code`.
 *   • Defect (uncaught exception, missing dependency, etc.) → logged with the
 *     full `Cause` pretty-printed locally; the client receives a generic 500
 *     so internals (stack traces, queries, env values) never cross the wire.
 *   • Interrupt → re-mapped to a 500 with code `"Interrupted"`.
 *
 * Use this in every `createServerFn` handler.
 */
export const runServer = async <A>(effect: AppEffect<A>): Promise<A> => {
  const exit = await runtime.runPromiseExit(effect)
  if (Exit.isSuccess(exit)) return exit.value

  const failure = Cause.failureOption(exit.cause)
  if (Option.isSome(failure)) throw new ServerError(failure.value)

  if (Cause.isInterruptedOnly(exit.cause)) {
    throw makeInternalServerError("Interrupted", "Request was interrupted")
  }

  // Defect — log the pretty cause server-side, return a sanitised error to
  // the client. Never include `Cause.pretty(...)` in the thrown message.
  console.error("[runServer] Unhandled defect:\n" + Cause.pretty(exit.cause))
  throw makeInternalServerError("InternalError", "Internal Server Error")
}

const makeInternalServerError = (code: string, message: string) => {
  const err = new Error(message) as Error & { status: number; code: string }
  err.status = 500
  err.code = code
  err.name = "ServerError"
  return err
}
