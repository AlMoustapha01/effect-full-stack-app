import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
// Auth is the only cross-cutting feature in this template (see CLAUDE.md);
// importing `user` here is the sanctioned way to FK on the identity table.
import { user } from "@/features/auth/server/schema"

export const todo = pgTable("todo", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export type TodoRow = typeof todo.$inferSelect
export type NewTodoRow = typeof todo.$inferInsert
