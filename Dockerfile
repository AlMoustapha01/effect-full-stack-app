# syntax=docker/dockerfile:1.7
#
# Multi-stage production image for the TanStack Start / Nitro app.
# Built with Bun; runtime is a Node-compatible Nitro server.

ARG BUN_VERSION=1.3.14

# ─────────── base ─────────────────────────────────────────────
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app
ENV CI=1

# ─────────── deps ─────────────────────────────────────────────
# Install ALL dependencies (incl. dev) for the build.
# --ignore-scripts skips the `prepare: lefthook install` hook
# which requires a git repo (not present in build context).
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

# ─────────── builder ──────────────────────────────────────────
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ─────────── migrate ──────────────────────────────────────────
# One-shot image for `drizzle-kit push` against the compose postgres.
# Inherits node_modules from `deps` and ships just the files drizzle-kit
# actually loads (schemas + config) — no bind-mount of host source needed.
FROM base AS migrate
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY drizzle.config.ts ./
COPY tsconfig.json ./
# drizzle-kit globs src/features/**/server/schema.ts — copying the whole
# `src/features` tree is fine since only matching files are parsed.
COPY src/features ./src/features
CMD ["bun", "run", "db:push"]

# ─────────── runner ───────────────────────────────────────────
# Nitro's node-server preset emits a self-contained .output/. We run it under
# Bun (matches the build runtime; srvx — Nitro's server abstraction — picks
# the Bun branch when built with Bun, so the runtime must be Bun too).
# Bun's SIGTERM forwarding into node-compat HTTP servers is suboptimal; expect
# `docker stop` to fall back to its timeout. Production deploys should give
# the container a generous stop grace period.
FROM oven/bun:${BUN_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# tini reaps zombies and forwards SIGTERM/SIGINT to the inner process.
RUN apk add --no-cache tini

COPY --from=builder /app/.output ./.output

# Run as a non-root user
RUN addgroup -S app -g 1001 \
    && adduser -S app -G app -u 1001 \
    && chown -R app:app /app
USER app

EXPOSE 3000
STOPSIGNAL SIGTERM

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bun", ".output/server/index.mjs"]
