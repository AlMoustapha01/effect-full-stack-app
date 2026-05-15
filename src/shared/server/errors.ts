import { Schema } from "effect"

export class NotFoundError extends Schema.TaggedError<NotFoundError>()("NotFoundError", {
  resource: Schema.String,
  id: Schema.optional(Schema.String),
}) {}

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "UnauthorizedError",
  { message: Schema.optional(Schema.String) }
) {}

export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()("ForbiddenError", {
  message: Schema.optional(Schema.String),
}) {}

export class ValidationError extends Schema.TaggedError<ValidationError>()("ValidationError", {
  message: Schema.String,
  field: Schema.optional(Schema.String),
}) {}

export class ConflictError extends Schema.TaggedError<ConflictError>()("ConflictError", {
  message: Schema.String,
}) {}

export class DatabaseError extends Schema.TaggedError<DatabaseError>()("DatabaseError", {
  // Stored as a string (not Schema.Unknown) so encoding the error never leaks
  // driver internals: postgres-js error objects can carry the query, params,
  // and stack. Build instances via `databaseError(cause)` so the redaction is
  // applied at every call site.
  cause: Schema.String,
}) {}

/**
 * Project an arbitrary thrown value into the small, safe string the
 * `DatabaseError.cause` schema accepts. The postgres-js error class exposes
 * a `code` (5-char SQLSTATE) — keep it when present; otherwise fall back to
 * the error name. Never propagate the message or the query.
 */
export const databaseError = (cause: unknown): DatabaseError => {
  let summary = "unknown"
  if (cause && typeof cause === "object") {
    const c = cause as { code?: unknown; name?: unknown }
    if (typeof c.code === "string" && c.code.length > 0) summary = `pg:${c.code}`
    else if (typeof c.name === "string" && c.name.length > 0) summary = c.name
  }
  return new DatabaseError({ cause: summary })
}

export type AppError =
  | NotFoundError
  | UnauthorizedError
  | ForbiddenError
  | ValidationError
  | ConflictError
  | DatabaseError

const STATUS_BY_TAG: Record<AppError["_tag"], number> = {
  NotFoundError: 404,
  UnauthorizedError: 401,
  ForbiddenError: 403,
  ValidationError: 400,
  ConflictError: 409,
  DatabaseError: 500,
}

/**
 * Maps a tagged app error to an HTTP-ish shape consumable by server functions.
 * Throwing this from a server function surfaces the status to the client.
 */
export const toHttp = (error: AppError) => {
  const message = errorMessage(error)
  return {
    status: STATUS_BY_TAG[error._tag],
    code: error._tag,
    message,
  }
}

const errorMessage = (error: AppError): string => {
  switch (error._tag) {
    case "NotFoundError":
      return error.id ? `${error.resource} ${error.id} not found` : `${error.resource} not found`
    case "UnauthorizedError":
      return error.message ?? "Unauthorized"
    case "ForbiddenError":
      return error.message ?? "Forbidden"
    case "ValidationError":
      return error.message
    case "ConflictError":
      return error.message
    case "DatabaseError":
      return "Database error"
  }
}
