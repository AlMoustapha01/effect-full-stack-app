import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: false,
    environment: "node",
    setupFiles: [],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".output", ".tanstack", "e2e"],
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      BETTER_AUTH_SECRET: "test-secret-must-be-long-enough-for-validation",
      BETTER_AUTH_URL: "http://localhost:3000",
      NODE_ENV: "test",
    },
  },
})
