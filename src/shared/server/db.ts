import { Context, Effect, Layer } from "effect"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { env } from "./env"

import * as authSchema from "@/features/auth/server/schema"
import * as todosSchema from "@/features/todos/server/schema"

const schema = { ...authSchema, ...todosSchema }

export type Db = ReturnType<typeof drizzle<typeof schema>>

export class Database extends Context.Tag("Database")<Database, Db>() {}

const makeClient = () => {
  const client = postgres(env.DATABASE_URL, { prepare: false })
  return drizzle(client, { schema, casing: "snake_case" })
}

// Hot-reload-safe singleton: keep the same client across HMR reloads in dev.
const globalForDb = globalThis as unknown as { __db?: Db }
const db = globalForDb.__db ?? makeClient()
if (env.NODE_ENV !== "production") globalForDb.__db = db

export { db }

export const DatabaseLive = Layer.succeed(Database, db)

export const useDb = <A, E>(fn: (db: Db) => Effect.Effect<A, E>) => Effect.flatMap(Database, fn)
