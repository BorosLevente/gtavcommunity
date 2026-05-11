import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const applications = pgTable("applications", {
  id: serial().primaryKey(),
  username: text().notNull(),
  age: integer().notNull(),
  memberSince: text("member_since").notNull(),
  position: text().notNull(),
  motivation: text().notNull(),
  status: text().notNull().default("new"),
  auditionStatus: text("audition_status"),
  notes: text().default(""),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
});

export const adminAccounts = pgTable("admin_accounts", {
  id: serial().primaryKey(),
  username: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const sessions = pgTable("sessions", {
  id: text().primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => adminAccounts.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial().primaryKey(),
  type: text().notNull(),
  text: text().notNull(),
  username: text(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  id: serial().primaryKey(),
  key: text().notNull().unique(),
  value: text().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
