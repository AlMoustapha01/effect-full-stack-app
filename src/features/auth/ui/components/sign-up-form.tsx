import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Schema } from "effect"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signUp } from "@/features/auth/client"
import { SignUpInput } from "@/features/auth/domain/inputs"

interface SignUpFormProps {
  onSuccess?: () => void
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: { onChange: Schema.standardSchemaV1(SignUpInput) },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = await signUp.email(value)
      if (result.error) {
        setServerError(result.error.message ?? "Sign-up failed")
        return
      }
      onSuccess?.()
    },
  })

  return (
    <form
      className="w-full max-w-sm"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="name">
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                autoComplete="name"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                autoComplete="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name}>Password</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="new-password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "…" : "Sign up"}
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}
