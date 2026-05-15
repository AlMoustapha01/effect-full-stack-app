import { useForm } from "@tanstack/react-form"
import { Schema } from "effect"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CreateTodoInput } from "../../server/domain/todo"
import { useCreateTodo } from "../hooks/use-todos"

export function TodoForm() {
  const create = useCreateTodo()

  const form = useForm({
    defaultValues: { title: "" },
    validators: { onChange: Schema.standardSchemaV1(CreateTodoInput) },
    onSubmit: async ({ value, formApi }) => {
      await create.mutateAsync(value.title)
      formApi.reset()
    },
  })

  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="title">
        {(field) => (
          <Field orientation="horizontal" data-invalid={field.state.meta.errors.length > 0}>
            <FieldLabel htmlFor={field.name} className="sr-only">
              Todo title
            </FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="text"
              placeholder="What needs doing?"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={field.state.meta.errors.length > 0}
            />
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "…" : "Add"}
                </Button>
              )}
            </form.Subscribe>
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
    </form>
  )
}
