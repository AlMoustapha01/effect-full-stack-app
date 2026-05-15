import { Schema } from "effect"

const EnvSchema = Schema.Struct({
  DATABASE_URL: Schema.NonEmptyString,
  BETTER_AUTH_SECRET: Schema.NonEmptyString,
  BETTER_AUTH_URL: Schema.NonEmptyString,
  NODE_ENV: Schema.optionalWith(Schema.Literal("development", "production", "test"), {
    default: () => "development" as const,
  }),
})

export type Env = typeof EnvSchema.Type

export const env: Env = Schema.decodeUnknownSync(EnvSchema)({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NODE_ENV: process.env.NODE_ENV,
})
