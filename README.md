# Effect Full-Stack Template

Opinionated template for full-stack apps around **Effect TS**, with a
**feature-based** architecture.

## Stack

| Layer       | Tool                                                        |
| ----------- | ----------------------------------------------------------- |
| Framework   | [TanStack Start](https://tanstack.com/start) (Nitro)        |
| UI          | React 19 + TailwindCSS v4 + shadcn/ui (Base UI)             |
| Forms       | [TanStack Form](https://tanstack.com/form) + shadcn `Field` |
| Data        | [TanStack Query](https://tanstack.com/query)                |
| Server core | [Effect](https://effect.website) (Layers + Schema)          |
| Database    | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/)     |
| Auth        | [better-auth](https://www.better-auth.com/) (email/pw)      |
| Lint/format | [oxlint](https://oxc.rs) + [oxfmt](https://oxc.rs)          |
| Git hooks   | [lefthook](https://lefthook.dev)                            |
| Tests       | Vitest (unit) + Playwright (e2e)                            |

## Quick start

```bash
# 1. install
bun install

# 2. configure env (DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL)
cp .env.example .env

# 3. start a local postgres on host port 5433 (docker required)
docker compose up -d

# 4. push schema
bun db:push

# 5. dev server on http://localhost:3000
bun dev
```

> Why **port 5433**? `compose.yml` publishes postgres on host port 5433 (not the
> default 5432) so the template starts cleanly even when a system or other-project
> postgres is already on 5432. Override with `POSTGRES_PORT=5432 docker compose up`
> if you prefer the standard port (also update `DATABASE_URL` in `.env`).

Then open [http://localhost:3000](http://localhost:3000), sign up, and start
adding todos.

## Docker

The repo ships with `compose.yml` and a multi-stage `Dockerfile`.

```bash
# Local dev — postgres only (use with `bun dev`)
docker compose up -d
docker compose down

# Full containerized run — builds the app image too
export BETTER_AUTH_SECRET="$(openssl rand -hex 32)"
docker compose --profile app up -d --build
docker compose --profile migrate run --rm migrate   # apply schema

# Image build alone (for deployment elsewhere)
docker build -t effect-full-stack-app .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=... \
  -e BETTER_AUTH_SECRET=... \
  -e BETTER_AUTH_URL=https://yourdomain.com \
  effect-full-stack-app
```

Postgres data is persisted in the `postgres-data` named volume. Wipe it with
`docker compose down -v` if you want a clean slate.

## Project layout

```
src/
├── features/            # vertical slices, each autonomous
│   ├── auth/            #   better-auth (cross-cutting)
│   │   ├── server/      #     auth instance, drizzle schema, middleware
│   │   ├── ui/          #     forms, components
│   │   └── client.ts    #     better-auth react client
│   └── todos/           #   reference vertical slice
│       ├── server/
│       │   ├── domain/          # Effect Schemas (Todo, inputs, errors)
│       │   ├── application/     # use-cases (Effect.gen)
│       │   ├── infrastructure/  # TodosRepository Layer (Drizzle)
│       │   ├── functions/       # createServerFn wrappers
│       │   └── schema.ts        # Drizzle table
│       ├── ui/
│       │   ├── components/      # UI components
│       │   └── hooks/           # TanStack Query wrappers
│       └── __tests__/           # Vitest unit tests
├── shared/
│   └── server/          # cross-feature server infra
│       ├── env.ts       #   env validation (Effect Schema)
│       ├── db.ts        #   Drizzle client + Database Tag/Layer
│       ├── runtime.ts   #   ManagedRuntime + AppLayer + runServer()
│       ├── errors.ts    #   tagged AppError types + HTTP mapping
│       └── logger.ts    #   Effect Logger Layer
├── components/ui/       # shadcn-managed UI primitives
├── lib/utils.ts         # cn() etc.
└── routes/              # TanStack Router file routes
    ├── __root.tsx       #   QueryClientProvider, devtools
    ├── index.tsx        #   landing
    ├── sign-in.tsx
    ├── sign-up.tsx
    ├── todos.tsx        #   protected
    └── api/auth/$.ts    #   better-auth catch-all handler
e2e/                     # Playwright specs
drizzle/                 # generated migrations
```

## Adding a feature

1. Copy `src/features/todos/` to `src/features/<name>/`.
2. Rename the Drizzle table in `server/schema.ts`.
3. Update `server/domain/`, `server/application/`, `server/infrastructure/`,
   `server/functions/` to match the new entity.
4. If your repository is new, register its `Live` Layer in
   `src/shared/server/runtime.ts`. Wrap with `Layer.provide(DatabaseLive)`
   so the repository's `Database` dependency is satisfied:

   ```ts
   export const AppLayer = Layer.mergeAll(
     DatabaseLive,
     LoggerLive,
     TodosRepositoryLive.pipe(Layer.provide(DatabaseLive)),
     YourFeatureRepositoryLive.pipe(Layer.provide(DatabaseLive)) // ← add here
   )
   ```

5. Generate & apply the migration:
   ```bash
   bun db:generate
   bun db:push
   ```
6. Add UI components in `ui/` and a TanStack route in `src/routes/`.

## Commands

| Command            | What it does                  |
| ------------------ | ----------------------------- |
| `bun dev`          | Start dev server on port 3000 |
| `bun build`        | Production build              |
| `bun start`        | Run the built server          |
| `bun lint`         | oxlint                        |
| `bun lint:fix`     | oxlint with autofix           |
| `bun format`       | oxfmt (writes)                |
| `bun format:check` | oxfmt --check                 |
| `bun typecheck`    | `tsc --noEmit`                |
| `bun test`         | Vitest unit tests             |
| `bun test:watch`   | Vitest in watch mode          |
| `bun test:e2e`     | Playwright end-to-end         |
| `bun db:generate`  | Generate Drizzle migrations   |
| `bun db:migrate`   | Apply migrations              |
| `bun db:push`      | Push schema (dev)             |
| `bun db:studio`    | Drizzle Studio                |

## Git hooks (lefthook)

Installed automatically via `bun install` (`prepare` script):

- **pre-commit** — `oxlint --fix` + `oxfmt --write` on staged files.
- **pre-push** — `bun typecheck` + `bun test`.

See [`lefthook.yml`](./lefthook.yml).

## Architecture

See [docs/architecture.md](./docs/architecture.md) for the rules of the road
(feature isolation, Effect Layer composition, error mapping).
