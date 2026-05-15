# CLAUDE.md

Project-specific instructions for Claude Code. Read this before suggesting code.

## Stack (locked-in)

- **Framework**: TanStack Start (Nitro). Monolith — no separate API server.
- **UI**: React 19 + TailwindCSS v4 + shadcn/ui on Base UI primitives.
- **Server runtime**: Effect TS (Layers, Schema, ManagedRuntime).
- **DB**: PostgreSQL via Drizzle ORM (driver: `postgres-js`).
- **Auth**: better-auth (email/password), Drizzle adapter.
- **Lint/format**: oxlint + oxfmt (NOT eslint/prettier — don't reintroduce them).
- **Git hooks**: lefthook.
- **Tests**: Vitest (unit) + Playwright (e2e).
- **Runtime/package manager**: Bun.

## Architecture rules

Read `docs/architecture.md` for the full rationale. The non-negotiables:

1. **Feature isolation** — a feature in `src/features/<x>/` must NEVER import from another feature. If two features need the same code, move it to `src/shared/`. **Single exception — `src/features/auth/` is cross-cutting**. Any feature may import from `auth`:
   - `requireAuth` middleware (`@/features/auth/server/middleware`) — to gate server functions
   - `client` (`@/features/auth/client`) — for session info and sign-in/out from UI
   - `schema` (`@/features/auth/server/schema`) — **for FK targets only**. Any feature that owns user-scoped data references `user.id`; this is the only sanctioned cross-feature import of a Drizzle table.
2. **Drizzle schemas live in the feature**, not in a central `db/schema/` folder. `drizzle.config.ts` aggregates them via glob `src/features/**/server/schema.ts`.
3. **No barrel files**. Always import the direct path (`@/features/todos/server/domain/todo`). Barrels hide coupling and bloat HMR.
4. **One shared `ManagedRuntime`** at `src/shared/server/runtime.ts`. Every feature with infrastructure registers its `*Live` Layer in `AppLayer` there.
5. **Server functions are the boundary**. Client code (`ui/`) reaches the server **only** via `server/functions/*.fn.ts`. The TanStack Start compiler treats these `.fn.ts` modules as isomorphic — the import is rewritten to an RPC call on the client and stays as a regular function call on the server, so importing them from `ui/hooks/` is correct and intended. The client must NEVER import from `server/domain`, `server/application`, `server/infrastructure`, or `server/schema.ts` directly — those pull in Drizzle, Effect runtimes, and DB drivers that should not exist in the client bundle.
6. **Effect stays server-side**. The frontend uses React + TanStack Query; it does not run Effect.

## Feature layout (vertical slice)

```
src/features/<name>/
├── server/
│   ├── domain/           # Effect.Schema entities, value objects, errors. Pure.
│   ├── application/      # use-cases as Effect.gen functions. No I/O directly.
│   ├── infrastructure/   # Drizzle repos / external clients. Expose Tag + Live Layer.
│   ├── functions/        # createServerFn wrappers (the network boundary).
│   └── schema.ts         # Drizzle pgTable(s).
├── ui/
│   ├── components/       # React components.
│   ├── hooks/            # TanStack Query wrappers around the server fns.
│   └── routes/           # (optional) feature-local route components — but route
│                         #   files in src/routes/ usually just re-export from here.
├── __tests__/            # Vitest unit tests (use-cases with mocked Layers).
└── client.ts             # (optional) client-side exports for cross-feature use.
```

## Effect conventions

### Domain entities

Domain entities (Todo, User-shaped types, …) are `Schema.Struct`, **not** `Schema.Class`. Reason: server function return values cross the wire via Seroval, which rejects class instances (non-standard prototype) with `SerovalUnsupportedTypeError`. Plain Structs are JSON-serialisable and round-trip cleanly through TanStack Start's RPC.

```ts
// ✅ Right — plain struct
export const Todo = Schema.Struct({
  id: Schema.UUID,
  userId: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  completed: Schema.Boolean,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
})
export type Todo = typeof Todo.Type

// ❌ Wrong — Seroval will reject class instances at the .fn.ts boundary
export class Todo extends Schema.Class<Todo>("Todo")({ ... }) {}
```

If you need `Schema.Class` for a richer entity (methods, identity), you MUST encode at the boundary in `.fn.ts`:

```ts
.handler(({ context }) =>
  runServer(Effect.map(listTodos(context.user.id), Schema.encodeSync(Schema.Array(Todo))))
)
```

For the default case (no behaviour on the entity), prefer Struct — simpler, no encode step.

### Use-cases

```ts
// application/create-todo.ts
import { Effect } from "effect"
import { TodosRepository } from "../infrastructure/todos-repository"
import type { CreateTodoInput } from "../domain/todo"

export const createTodo = (input: CreateTodoInput, userId: string) =>
  Effect.gen(function* () {
    const repo = yield* TodosRepository
    return yield* repo.create({ userId, title: input.title })
  })
```

- Use `Effect.gen(function* () { ... })` for readability.
- Use-cases take the authenticated `userId` as a separate argument; they don't read auth state themselves.
- Errors must be tagged via `Schema.TaggedError` from `@/shared/server/errors` — never throw raw, never return `unknown`.

### Repositories

```ts
// infrastructure/todos-repository.ts
export class TodosRepository extends Context.Tag("TodosRepository")<
  TodosRepository,
  TodosRepositoryShape
>() {}

export const TodosRepositoryLive = Layer.effect(
  TodosRepository,
  Effect.gen(function* () {
    const db = yield* Database
    return TodosRepository.of({
      /* methods using db, returning Effect */
    })
  })
)
```

- Tag + Live Layer in the same file (export both).
- Every DB call goes through `Effect.tryPromise({ try, catch: (cause) => new DatabaseError({ cause }) })`.
- Register the Live in `AppLayer` (`src/shared/server/runtime.ts`), wrapping with `.pipe(Layer.provide(DatabaseLive))` if it depends on `Database`.

### Server functions (the boundary)

```ts
// functions/create-todo.fn.ts
import { createServerFn } from "@tanstack/react-start"
import { Schema } from "effect"
import { requireAuth } from "@/features/auth/server/middleware"
import { runServer } from "@/shared/server/runtime"
import { createTodo } from "../application/create-todo"
import { CreateTodoInput } from "../domain/todo"

export const createTodoFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(Schema.standardSchemaV1(CreateTodoInput))
  .handler(({ data, context }) => runServer(createTodo(data, context.user.id)))
```

- File suffix `.fn.ts` so they're easy to grep.
- Always validate input with `Schema.standardSchemaV1(<EffectSchema>)`.
- Attach `requireAuth` whenever the endpoint needs a user; the handler gets `context.user` and `context.session`.
- Always wrap the effect in `runServer(...)`. This converts `AppError` into `ServerError` (with `status` + `code`) and prevents `FiberFailure` leaking across the wire.

### Errors

`src/shared/server/errors.ts` defines the `AppError` union. Each tag maps to an HTTP status:

| Tag                 | Status |
| ------------------- | ------ |
| `NotFoundError`     | 404    |
| `UnauthorizedError` | 401    |
| `ForbiddenError`    | 403    |
| `ValidationError`   | 400    |
| `ConflictError`     | 409    |
| `DatabaseError`     | 500    |

Add a new tag only if a new HTTP status genuinely makes sense — don't proliferate.

## UI conventions

- TanStack Query for ALL server-fn calls. Wrap each fn in a hook in `ui/hooks/`.
- Query keys are arrays; co-locate them with the hook file.
- Route files in `src/routes/` are thin: define `createFileRoute(...)` with `beforeLoad`/`component` and import the heavy UI from `@/features/<x>/ui/components`.
- Use `getSession()` inside `beforeLoad` to gate protected routes — redirect with `throw redirect({ to: "/sign-in" })`.
- shadcn/ui components live in `src/components/ui/` (kept at standard paths so `bunx shadcn add <component>` works). `cn()` is at `src/lib/utils.ts`. **Do NOT move these.**
- Base UI's `Button` does not support `asChild` — use the `render` prop or compose via `buttonVariants(...)` className on a `<Link>`.

### Forms

**ALL forms use TanStack Form + shadcn `Field`.** No native `useState` for form state, no `react-hook-form`, no raw `<input>` without `<Field>` wrapping.

The contract per form:

1. Define an Effect Schema for the input in the feature's `domain/` folder (e.g. `SignInInput`, `CreateTodoInput`).
2. Pass `Schema.standardSchemaV1(MyInput)` as the form's `validators.onChange` — TanStack Form consumes Standard Schema v1, and Effect Schema produces it.
3. Use shadcn's `Field` / `FieldLabel` / `FieldError` / `FieldGroup` / `Input` to render each field. Spread `field.state.meta.errors` directly into `<FieldError errors={...} />` — the shape matches.
4. Use `<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>` for submit-button state (avoids re-rendering the whole form on each keystroke).
5. One form component per shape. If you have sign-in and sign-up (different field sets), make `SignInForm` and `SignUpForm` — don't try to unify them with a discriminated union, the types blow up.

Reference implementations: `src/features/auth/ui/components/sign-in-form.tsx`, `src/features/todos/ui/components/todo-form.tsx`.

```tsx
const form = useForm({
  defaultValues: { email: "", password: "" },
  validators: { onChange: Schema.standardSchemaV1(SignInInput) },
  onSubmit: async ({ value }) => { /* call server fn */ },
})

<form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
  <FieldGroup>
    <form.Field name="email">
      {(field) => (
        <Field data-invalid={field.state.meta.errors.length > 0}>
          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
          <Input
            id={field.name}
            name={field.name}
            type="email"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            aria-invalid={field.state.meta.errors.length > 0}
          />
          <FieldError errors={field.state.meta.errors} />
        </Field>
      )}
    </form.Field>
    {/* ...other fields... */}
  </FieldGroup>
</form>
```

## Testing conventions

- **Unit tests (Vitest)** — test use-cases by providing a stub repo Layer:
  ```ts
  const FakeRepo = Layer.succeed(TodosRepository, {
    /* stub methods */
  })
  Effect.runPromise(myUseCase(input).pipe(Effect.provide(FakeRepo)))
  ```
  No real DB. No real auth.
- Test env vars are set in `vitest.config.ts` under `test.env` — don't read `.env` in tests.
- **E2E (Playwright)** — full-app, real DB. Specs in `e2e/`. Use `data-testid` attributes on UI elements that tests need to grab (see `todo-item.tsx` for the pattern).
- Don't add integration tests against a real DB unless you also set up CI to spin up a Postgres service.

## Adding a feature (the playbook)

1. `cp -r src/features/todos src/features/<name>` then rename.
2. Update `server/schema.ts` with the new table.
3. Update `server/domain/`, `server/application/`, `server/infrastructure/`, `server/functions/` for the new entity.
4. Register the repository Live Layer in `src/shared/server/runtime.ts`:
   ```ts
   export const AppLayer = Layer.mergeAll(
     DatabaseLive,
     LoggerLive,
     TodosRepositoryLive.pipe(Layer.provide(DatabaseLive)),
     YourRepositoryLive.pipe(Layer.provide(DatabaseLive)) // ← here
   )
   ```
5. Update `src/shared/server/db.ts` to merge the new schema into the Drizzle client:
   ```ts
   import * as yourSchema from "@/features/<name>/server/schema"
   const schema = { ...authSchema, ...todosSchema, ...yourSchema }
   ```
6. `bun db:generate && bun db:push`.
7. Add UI hooks/components in `ui/`, then a thin route file in `src/routes/`.
8. Add at least one Vitest unit test for the main use-case.
9. (Recommended) Add an e2e spec covering the happy path.

## Docker

- `compose.yml` runs a local postgres for dev (default profile). Use `docker compose up -d`.
- **Host port is 5433** (override with `POSTGRES_PORT=5432`) — deliberately not the default 5432 to avoid colliding with system postgres or other projects. `.env.example`'s `DATABASE_URL` matches this. If you change the host port, change `DATABASE_URL` too.
- The `app` profile builds and runs the production image: `docker compose --profile app up -d --build`. Requires `BETTER_AUTH_SECRET` in env. App-to-postgres uses the internal port 5432 via the `postgres` service name (already wired).
- The `migrate` profile applies the schema against the compose postgres: `docker compose --profile migrate run --rm migrate`.
- `Dockerfile` is a multi-stage Bun build: `deps` (install with `--ignore-scripts` to skip `lefthook install`), `builder` (`bun run build`), `runner` (copies `.output/` only, runs as non-root under `tini`, no node_modules at runtime — Nitro's node-server preset is self-contained). The runner uses Bun, not Node, because srvx (Nitro's server abstraction) tree-shakes the Node branch when the build runtime is Bun — runtime must match build.
- **Known limitation**: Bun's SIGTERM forwarding to node-compat HTTP servers is incomplete. `docker stop` may hit its stop-timeout (default 10s) before the server exits. In production give the container a comfortable `stop_grace_period` (k8s `terminationGracePeriodSeconds: 30+`). Don't switch the runner to Node alone — see the comment in `Dockerfile`.
- `.dockerignore` excludes tests, docs, e2e, env files — keep it that way so build context stays small.
- Don't add `postinstall` scripts that require git or a TTY — they'll break the `deps` stage.

## Known stack quirks

- **zod is pinned at v4** as a direct dep. better-auth requires v4 (uses `.meta()`); several tanstack build-time packages declare v3 in `dependencies` (not peer) so they keep their nested copies. Don't downgrade top-level zod.

## Commands

```bash
bun dev               # vite dev on :3000
bun build && bun start
bun lint              # oxlint
bun lint:fix
bun format            # oxfmt --write
bun format:check
bun typecheck         # tsc --noEmit
bun test              # vitest run
bun test:watch
bun test:e2e          # playwright
bun db:generate       # drizzle-kit generate
bun db:migrate
bun db:push           # dev: push schema directly
bun db:studio

docker compose up -d                       # start postgres
docker compose --profile app up -d --build # postgres + app container
docker build -t effect-full-stack-app .    # build production image
```

## Don'ts

- Don't reintroduce eslint or prettier.
- Don't create a separate API server (Hono, Express, etc.) — server functions are the API.
- Don't put Drizzle schemas in `src/db/` or `src/lib/db/`. They live in the feature.
- Don't create barrel `index.ts` files in features.
- Don't run Effect on the client. If you find yourself wanting to, you probably want a server function instead.
- Don't add new top-level folders without a strong reason — the current shape (`features/`, `shared/`, `routes/`, `components/`, `lib/`) covers most needs.
- Don't `throw` raw errors from use-cases. Always tagged via `Schema.TaggedError`.
- Don't bypass `runServer()` in server function handlers — it's the single mapping layer between Effect errors and HTTP.
- Don't skip `requireAuth` on mutating server functions without a deliberate reason; security-by-default.
- Don't write forms with raw `useState` + `<input>` — use TanStack Form + shadcn `Field` (see "Forms" above).
- Don't add `react-hook-form`, `formik`, or any other form library — TanStack Form is the chosen one.
- Don't return `Schema.Class` instances from server functions — Seroval can't serialise them. Use `Schema.Struct` for entities, or encode with `Schema.encodeSync(...)` at the boundary if you really need a class.
- Don't commit `.env` (it's gitignored). `.env.example` documents the required vars.
