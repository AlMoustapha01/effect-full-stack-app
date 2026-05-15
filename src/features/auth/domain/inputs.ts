import { Schema } from "effect"

export const Email = Schema.NonEmptyString.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: () => "Invalid email" })
)

// Bounds mirror better-auth's emailAndPassword config (auth.ts). Keep them in
// sync — the server-side cap is the real bcrypt-DoS guard; this one is for
// UX so the form rejects pathological input before hitting the network.
export const Password = Schema.NonEmptyString.pipe(
  Schema.minLength(8, { message: () => "Password must be at least 8 characters" }),
  Schema.maxLength(256, { message: () => "Password must be at most 256 characters" })
)

export const SignInInput = Schema.Struct({
  email: Email,
  password: Password,
})
export type SignInInput = typeof SignInInput.Type

export const SignUpInput = Schema.Struct({
  name: Schema.NonEmptyString.pipe(
    Schema.minLength(2, { message: () => "Name must be at least 2 characters" })
  ),
  email: Email,
  password: Password,
})
export type SignUpInput = typeof SignUpInput.Type
