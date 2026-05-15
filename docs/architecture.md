# Architecture

This template is organized as **vertical feature slices**, with **Effect TS**
as the backbone of the server runtime.

## Rules of the road

1. **A feature does not import from another feature.** If two features need
   the same code, the code moves to `src/shared/`. The single exception is
   `src/features/auth/` — its `requireAuth` middleware, react `client`, and
   Drizzle `schema` (FK targets, e.g. `user.id`) are cross-cutting and may be
   imported anywhere.
2. **Drizzle schemas live inside the feature that owns them**
   (`src/features/<name>/server/schema.ts`). `drizzle.config.ts` aggregates
   them with a glob (`src/features/**/server/schema.ts`).
3. **No barrel files.** Always import directly from the path. Barrels hide
   coupling and break tree-shaking in dev tooling.
4. **One shared `ManagedRuntime`.** Every feature that contributes
   infrastructure (a Layer) registers it in `AppLayer` in
   `src/shared/server/runtime.ts`.
5. **Server functions are the boundary.** All Effect code stays server-side.
   The client reaches the server **only** through `server/functions/*.fn.ts` —
   the TanStack Start compiler rewrites those imports to RPC calls. The client
   must NOT import from `server/domain`, `server/application`,
   `server/infrastructure`, or `server/schema.ts`.

## Layered structure of a feature's server side

```
features/<name>/server/
├── domain/           pure types + Effect.Schema entities, value objects,
│                     errors. Zero dependencies on infra.
├── application/      use-cases as `Effect.gen` functions. Depend only on
│                     domain types and infrastructure Tags.
├── infrastructure/   Drizzle repositories, external API clients. Provide
│                     `*Live` Layers consumed by `AppLayer`.
├── functions/        thin createServerFn wrappers. Validate input with
│                     `Schema.standardSchemaV1`, attach `requireAuth`
│                     middleware, run the use-case via `runServer(...)`.
└── schema.ts         Drizzle pgTable definitions.
```

## Effect runtime

`src/shared/server/runtime.ts` constructs one `ManagedRuntime` per process,
cached on `globalThis` to survive HMR in dev. It exposes:

```ts
runServer<A, E extends AppError>(effect): Promise<A>
```

`runServer` runs the effect, unwraps the `Exit`, and if the failure is a
tagged `AppError` (`NotFoundError`, `UnauthorizedError`, …) converts it to a
`ServerError` (a plain `Error` with `status` + `code`). The client receives a
normal rejected promise — no `FiberFailure` leakage across the network.

## Error model

`src/shared/server/errors.ts` defines the `AppError` union via
`Schema.TaggedError`. Each tag maps to an HTTP status:

| Tag                 | Status |
| ------------------- | ------ |
| `NotFoundError`     | 404    |
| `UnauthorizedError` | 401    |
| `ForbiddenError`    | 403    |
| `ValidationError`   | 400    |
| `ConflictError`     | 409    |
| `DatabaseError`     | 500    |

Use-cases and repositories return `Effect.Effect<A, AppError, R>`. Any other
failure (defects, interruptions) bubbles up as a generic 500.

## Testing strategy

- **Unit tests (Vitest)** — test use-cases by providing a stub Layer for the
  repository: `Layer.succeed(TodosRepository, { … })`. No DB, no auth.
- **Integration tests (Vitest)** — optional. If you add them, hit a real
  test database (`.env.test`).
- **E2E (Playwright)** — drives the real app via `bun dev`. Hits the real
  DB. Tests are written from the user's point of view.

## Why TanStack Start + Effect (not Hono on the side)

TanStack Start's `createServerFn` already gives us typed, validated,
middleware-aware RPC over HTTP — duplicating that with a separate Hono
server would be friction without payoff. Effect lives inside the server
function body, where it adds the most value: structured concurrency, typed
errors, dependency injection via Layers.
