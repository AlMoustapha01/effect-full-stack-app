import { Schema } from "effect"

export const Email = Schema.NonEmptyString.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: () => "Invalid email" })
)

export const Password = Schema.NonEmptyString.pipe(
  Schema.minLength(8, { message: () => "Password must be at least 8 characters" })
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
