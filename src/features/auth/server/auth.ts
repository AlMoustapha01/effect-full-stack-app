import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/shared/server/db"
import { env } from "@/shared/server/env"
import * as schema from "./schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    // Cap input length so the bcrypt round can't be turned into a CPU-DoS
    // by an attacker submitting megabyte-sized passwords.
    maxPasswordLength: 256,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh after 1 day
  },
  trustedOrigins: [env.BETTER_AUTH_URL],
})

export type Auth = typeof auth
