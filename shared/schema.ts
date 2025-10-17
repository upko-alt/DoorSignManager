import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Department members with their door sign information
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  currentStatus: text("current_status").notNull().default("Available"),
  customStatusText: text("custom_status_text"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  lastUpdated: true,
});

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

// Predefined status options
export const PREDEFINED_STATUSES = [
  "Available",
  "In Meeting",
  "Out",
  "Do Not Disturb",
  "Be Right Back",
] as const;

export type PredefinedStatus = typeof PREDEFINED_STATUSES[number];

// Status update schema
export const updateStatusSchema = z.object({
  memberId: z.string(),
  status: z.string().min(1).max(50),
  customText: z.string().max(50).optional(),
});

export type UpdateStatus = z.infer<typeof updateStatusSchema>;

// Status history table to track all status changes
export const statusHistory = pgTable("status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  customStatusText: text("custom_status_text"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  changedBy: varchar("changed_by"), // Will be used for user tracking later
});

export const insertStatusHistorySchema = createInsertSchema(statusHistory).omit({
  id: true,
  changedAt: true,
});

export type InsertStatusHistory = z.infer<typeof insertStatusHistorySchema>;
export type StatusHistory = typeof statusHistory.$inferSelect;

// E-paper sync status
export interface EpaperSyncStatus {
  lastSync: Date;
  syncing: boolean;
  error?: string;
}
