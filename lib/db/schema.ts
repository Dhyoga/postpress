import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  jsonb,
  integer,
  index,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  userAgent: text("user_agent"),
});

export const igAccounts = pgTable("ig_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  handle: text("handle").notNull(),
  igUserId: text("ig_user_id").notNull(),
  tokenEncrypted: text("token_encrypted").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
});

export const contentPlans = pgTable("content_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => igAccounts.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  themes: jsonb("themes").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => igAccounts.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => contentPlans.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    template: text("template").notNull(),
    topic: text("topic").notNull(),
    caption: text("caption"),
    hashtags: text("hashtags").array(),
    status: text("status").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    igMediaId: text("ig_media_id"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    accountIdIdx: index("posts_account_id_idx").on(t.accountId),
    statusIdx: index("posts_status_idx").on(t.status),
  }),
);

export const slides = pgTable(
  "slides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: text("kind").notNull(),
    content: jsonb("content").notNull(),
    imageUrl: text("image_url"),
  },
  (t) => ({
    postIdPositionUnique: unique("slides_post_id_position_unique").on(t.postId, t.position),
  }),
);

export const publishLogs = pgTable(
  "publish_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    attempt: integer("attempt").notNull(),
    phase: text("phase").notNull(),
    request: jsonb("request"),
    response: jsonb("response"),
    ok: boolean("ok").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    postIdIdx: index("publish_logs_post_id_idx").on(t.postId),
  }),
);

export const personas = pgTable("personas", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => igAccounts.id, { onDelete: "cascade" }).unique(),
  brandName: text("brand_name"),
  tagline: text("tagline"),
  positioning: text("positioning"),
  dos: text("dos"),
  donts: text("donts"),
  contentMix: jsonb("content_mix"),
  postFrequency: integer("post_frequency"),
  voicePillars: jsonb("voice_pillars"),
  voicePairs: jsonb("voice_pairs"),
  coreValues: text("core_values"),
  sapaan: text("sapaan"),
  istilahAsing: text("istilah_asing"),
  formatTanggalContoh: text("format_tanggal_contoh"),
  formatAngkaContoh: text("format_angka_contoh"),
  gayaJudul: text("gaya_judul"),
  colors: jsonb("colors"),
  fonts: jsonb("fonts"),
  visualLarangan: text("visual_larangan"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const personaSegments = pgTable(
  "persona_segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personaId: uuid("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tier: text("tier"),
    description: text("description"),
    painPoint: text("pain_point"),
    need: text("need"),
  },
  (t) => ({
    personaIdIdx: index("persona_segments_persona_id_idx").on(t.personaId),
  }),
);

export const personaKeywords = pgTable(
  "persona_keywords",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personaId: uuid("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    value: text("value").notNull(),
  },
  (t) => ({
    personaIdCategoryValueUnique: unique("persona_keywords_persona_id_category_value_unique").on(t.personaId, t.category, t.value),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type IgAccount = typeof igAccounts.$inferSelect;
export type NewIgAccount = typeof igAccounts.$inferInsert;
export type ContentPlan = typeof contentPlans.$inferSelect;
export type NewContentPlan = typeof contentPlans.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Slide = typeof slides.$inferSelect;
export type NewSlide = typeof slides.$inferInsert;
export type PublishLog = typeof publishLogs.$inferSelect;
export type NewPublishLog = typeof publishLogs.$inferInsert;
export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;
export type PersonaSegment = typeof personaSegments.$inferSelect;
export type NewPersonaSegment = typeof personaSegments.$inferInsert;
export type PersonaKeyword = typeof personaKeywords.$inferSelect;
export type NewPersonaKeyword = typeof personaKeywords.$inferInsert;

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const igAccountsRelations = relations(igAccounts, ({ many, one }) => ({
  contentPlans: many(contentPlans),
  posts: many(posts),
  persona: one(personas),
}));

export const contentPlansRelations = relations(contentPlans, ({ one, many }) => ({
  account: one(igAccounts, {
    fields: [contentPlans.accountId],
    references: [igAccounts.id],
  }),
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  account: one(igAccounts, {
    fields: [posts.accountId],
    references: [igAccounts.id],
  }),
  plan: one(contentPlans, {
    fields: [posts.planId],
    references: [contentPlans.id],
  }),
  slides: many(slides),
  publishLogs: many(publishLogs),
}));

export const slidesRelations = relations(slides, ({ one }) => ({
  post: one(posts, {
    fields: [slides.postId],
    references: [posts.id],
  }),
}));

export const publishLogsRelations = relations(publishLogs, ({ one }) => ({
  post: one(posts, {
    fields: [publishLogs.postId],
    references: [posts.id],
  }),
}));

export const personasRelations = relations(personas, ({ one, many }) => ({
  account: one(igAccounts, {
    fields: [personas.accountId],
    references: [igAccounts.id],
  }),
  segments: many(personaSegments),
  keywords: many(personaKeywords),
}));

export const personaSegmentsRelations = relations(personaSegments, ({ one }) => ({
  persona: one(personas, {
    fields: [personaSegments.personaId],
    references: [personas.id],
  }),
}));

export const personaKeywordsRelations = relations(personaKeywords, ({ one }) => ({
  persona: one(personas, {
    fields: [personaKeywords.personaId],
    references: [personas.id],
  }),
}));
