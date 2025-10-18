import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User table - combines authentication and door sign profile
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role").notNull().default("regular"), // admin or regular
  epaperId: varchar("epaper_id").notNull(), // Specific ID for e-paper system (e.g., "user1", "user2")
  // E-paper API configuration (per-user)
  epaperImportUrl: text("epaper_import_url"), // URL to send status updates
  epaperExportUrl: text("epaper_export_url"), // URL to fetch status
  epaperImportKey: text("epaper_import_key"), // API key for import (sending status updates)
  epaperExportKey: text("epaper_export_key"), // API key for export (fetching status)
  // Door sign status fields
  avatarUrl: text("avatar_url"),
  currentStatus: text("current_status").notNull().default("Available"),
  customStatusText: text("custom_status_text"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUpdated: true,
  passwordHash: true,
  currentStatus: true,
  customStatusText: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  epaperId: z.string().min(1, "E-paper ID is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Status options table for configurable predefined statuses
export const statusOptions = pgTable("status_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  color: varchar("color").notNull().default("blue"), // color indicator for UI
  sortOrder: varchar("sort_order").notNull().default("0"), // for custom ordering (stored as string for compatibility)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStatusOptionSchema = createInsertSchema(statusOptions)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
    color: z.enum(["blue", "green", "red", "yellow", "purple", "orange", "gray"], {
      errorMap: () => ({ message: "Invalid color" })
    }),
    sortOrder: z.string().regex(/^\d+$/, "Sort order must be a positive number").default("0"),
  });

export type InsertStatusOption = z.infer<typeof insertStatusOptionSchema>;
export type StatusOption = typeof statusOptions.$inferSelect;

// Default status options (kept for backward compatibility and seeding)
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
  userId: z.string(),
  status: z.string().min(1).max(50),
  customText: z.string().max(50).optional(),
});

export type UpdateStatus = z.infer<typeof updateStatusSchema>;

// Status history table to track all status changes
export const statusHistory = pgTable("status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  customStatusText: text("custom_status_text"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  changedBy: varchar("changed_by"), // User who made the change
});

export const insertStatusHistorySchema = createInsertSchema(statusHistory).omit({
  id: true,
  changedAt: true,
});

export type InsertStatusHistory = z.infer<typeof insertStatusHistorySchema>;
export type StatusHistory = typeof statusHistory.$inferSelect;

// Sync status table to track periodic e-paper sync operations
export const syncStatus = pgTable("sync_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  success: varchar("success").notNull().default("true"), // "true" or "false"
  errorMessage: text("error_message"),
  updatedCount: varchar("updated_count").notNull().default("0"), // stored as string for simplicity
});

export const insertSyncStatusSchema = createInsertSchema(syncStatus).omit({
  id: true,
  syncedAt: true,
});

export type InsertSyncStatus = z.infer<typeof insertSyncStatusSchema>;
export type SyncStatus = typeof syncStatus.$inferSelect;

// E-paper sync status (for UI display)
export interface EpaperSyncStatus {
  lastSync: Date;
  syncing: boolean;
  error?: string;
}
