import postgres from "postgres"

// Narrow, hard-coded email pattern used by every e2e spec so cleanup is safe:
// it will only ever match rows the suite itself created.
export const E2E_EMAIL_DOMAIN = "playwright.test"
export const E2E_EMAIL_PREFIX = "e2e-"

export const e2eEmail = (tag: string) =>
  `${E2E_EMAIL_PREFIX}${tag}-${Date.now().toString(36)}@${E2E_EMAIL_DOMAIN}`

export const wipeE2eRows = async () => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL must be set to run the e2e suite (cleanup needs it).")
  }

  const sql = postgres(url, { prepare: false, max: 1 })
  try {
    // FK cascades from `user` clean session/account/todos in one shot.
    await sql`DELETE FROM "user" WHERE email LIKE ${`${E2E_EMAIL_PREFIX}%@${E2E_EMAIL_DOMAIN}`}`
  } finally {
    await sql.end({ timeout: 2 })
  }
}
