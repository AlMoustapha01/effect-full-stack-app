import { createAuthClient } from "better-auth/react"

// On SSR, fall back to "" if BETTER_AUTH_URL is unset — `createAuthClient`
// doesn't throw on empty baseURL, and any actual auth call only happens in
// the browser where `window.location.origin` takes over.
const baseURL =
  typeof window === "undefined" ? (process.env.BETTER_AUTH_URL ?? "") : window.location.origin

export const authClient = createAuthClient({ baseURL })

// Call as `authClient.signIn.email(...)` etc. Don't re-export the methods
// destructured — better-auth's react client may rely on `this` on internal
// state, and destructuring detaches it.
