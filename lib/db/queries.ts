import { db } from "./index";
import { eq, ne, desc, and, lte } from "drizzle-orm";
import {
  users,
  sessions,
  igAccounts,
  contentPlans,
  posts,
  slides,
  publishLogs,
  personas,
  personaSegments,
  personaKeywords,
} from "./schema";

// -------------------- Users --------------------
export async function getUserByUsername(username: string) {
  return db.query.users.findFirst({ where: eq(users.username, username) });
}

export async function createUser(input: { username: string; passwordHash: string; role?: string }) {
  return db.insert(users).values(input).returning();
}

export async function updateUserLastLogin(userId: string) {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}

// -------------------- Sessions --------------------
export async function createSession(input: { userId: string; expiresAt: Date; userAgent?: string | null }) {
  return db.insert(sessions).values(input).returning();
}

export async function getSessionById(id: string) {
  return db.query.sessions.findFirst({
    where: eq(sessions.id, id),
    with: { user: true },
  });
}

export async function deleteSessionById(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id));
}

export async function deleteSessionsByUserId(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// -------------------- Posts --------------------
export async function listPosts(options: { accountId?: string; status?: string; limit?: number }) {
  const limit = options.limit ?? 50;
  const where = [];
  if (options.accountId) where.push(eq(posts.accountId, options.accountId));
  if (options.status) where.push(eq(posts.status, options.status));
  return db.query.posts.findMany({
    where: where.length ? and(...where) : undefined,
    orderBy: [desc(posts.createdAt)],
    limit,
    with: { slides: true, publishLogs: true },
  });
}

export async function getPost(id: string) {
  return db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: {
      slides: true,
      publishLogs: { orderBy: [desc(publishLogs.createdAt)] },
      plan: true,
    },
  });
}

export async function createPost(input: typeof posts.$inferInsert) {
  return db.insert(posts).values(input).returning();
}

/** Penjaga idempotensi `generate:daily` (Fase 5) — supaya cron yang jalan dua
 * kali untuk tanggal yang sama tidak membuat post duplikat. */
export async function findPostByTopic(accountId: string, topic: string) {
  return db.query.posts.findFirst({
    where: and(eq(posts.accountId, accountId), eq(posts.topic, topic)),
  });
}

/** Post `approved` yang jadwalnya sudah lewat — dipakai `publish:hourly` (Fase 5). */
export async function listDuePosts(limit = 20) {
  return db.query.posts.findMany({
    where: and(eq(posts.status, "approved"), lte(posts.scheduledFor, new Date())),
    orderBy: posts.scheduledFor,
    limit,
    with: { slides: true },
  });
}

export async function updatePost(id: string, input: Partial<typeof posts.$inferInsert>) {
  return db.update(posts).set({ ...input, updatedAt: new Date() }).where(eq(posts.id, id)).returning();
}

export async function deletePost(id: string) {
  return db.delete(posts).where(eq(posts.id, id)).returning();
}

export async function listSlides(postId: string) {
  return db.query.slides.findMany({
    where: eq(slides.postId, postId),
    orderBy: slides.position,
  });
}

export async function createSlide(input: typeof slides.$inferInsert) {
  return db.insert(slides).values(input).returning();
}

export async function replaceSlides(postId: string, items: typeof slides.$inferInsert[]) {
  await db.delete(slides).where(eq(slides.postId, postId));
  return db.insert(slides).values(items).returning();
}

export async function createPublishLog(input: typeof publishLogs.$inferInsert) {
  return db.insert(publishLogs).values(input).returning();
}

/** Percobaan publish terakhir (nomor + waktu) untuk sebuah post — dipakai
 * `publish:hourly` (Fase 5) menghitung apakah jendela backoff 1/5/25 menit
 * sudah lewat sebelum retry. */
export async function getLastPublishAttempt(postId: string) {
  return db.query.publishLogs.findFirst({
    where: eq(publishLogs.postId, postId),
    orderBy: [desc(publishLogs.createdAt)],
  });
}

/** 30 topik terakhir (dari post mana pun, bukan cuma yang sudah published) —
 * dipakai prompt planner supaya tidak mengulang bahasan yang sama
 * (design.md §6.1). */
export async function listRecentTopics(accountId: string, limit = 30) {
  const rows = await db.query.posts.findMany({
    where: eq(posts.accountId, accountId),
    orderBy: [desc(posts.createdAt)],
    limit,
    columns: { topic: true },
  });
  return rows.map((r) => r.topic);
}

// -------------------- Content plans --------------------
export async function listContentPlans(accountId: string) {
  return db.query.contentPlans.findMany({
    where: eq(contentPlans.accountId, accountId),
    orderBy: [desc(contentPlans.createdAt)],
    limit: 20,
  });
}

export async function createContentPlan(input: typeof contentPlans.$inferInsert) {
  return db.insert(contentPlans).values(input).returning();
}

export async function getContentPlan(id: string) {
  return db.query.contentPlans.findFirst({ where: eq(contentPlans.id, id) });
}

export async function updateContentPlanThemes(id: string, themes: unknown) {
  return db.update(contentPlans).set({ themes }).where(eq(contentPlans.id, id)).returning();
}

export async function deleteContentPlan(id: string) {
  return db.delete(contentPlans).where(eq(contentPlans.id, id)).returning();
}

// -------------------- IG Accounts --------------------
export async function listActiveAccounts() {
  return db.query.igAccounts.findMany({
    where: eq(igAccounts.isActive, true),
  });
}

/** Dipakai halaman Pengaturan — beda dari listActiveAccounts() karena UI perlu
 * menampilkan akun yang sudah diputuskan juga (supaya bisa disambungkan ulang),
 * bukan cuma yang aktif. Placeholder dari getOrCreateDefaultAccount() (belum
 * pernah disambungkan sungguhan) sengaja disembunyikan dari daftar ini. */
export async function listAllAccounts() {
  return db.query.igAccounts.findMany({
    where: ne(igAccounts.igUserId, "pending"),
    orderBy: [desc(igAccounts.isActive), igAccounts.handle],
  });
}

export async function getIgAccount(id: string) {
  return db.query.igAccounts.findFirst({ where: eq(igAccounts.id, id) });
}

export async function getIgAccountByHandle(handle: string) {
  return db.query.igAccounts.findFirst({ where: eq(igAccounts.handle, handle) });
}

export async function updateIgAccount(id: string, input: Partial<typeof igAccounts.$inferInsert>) {
  return db.update(igAccounts).set(input).where(eq(igAccounts.id, id)).returning();
}

export async function createIgAccount(input: typeof igAccounts.$inferInsert) {
  return db.insert(igAccounts).values(input).returning();
}

/** v1 mendukung satu akun IG per instalasi (lihat roadmap.md § Setelah v1 — UI
 * pemilih akun belum ada). Persona harus bisa diisi sebelum akun IG sungguhan
 * terhubung lewat OAuth (Fase 4), jadi kalau belum ada baris `ig_accounts`
 * sama sekali, buat satu placeholder tidak aktif supaya FK `personas.account_id`
 * punya sesuatu untuk ditunjuk. */
export async function getOrCreateDefaultAccount() {
  const existing = await db.query.igAccounts.findFirst({ orderBy: igAccounts.id });
  if (existing) return existing;
  const [created] = await db
    .insert(igAccounts)
    .values({ handle: "default", igUserId: "pending", tokenEncrypted: "", isActive: false })
    .returning();
  return created;
}

// -------------------- Persona --------------------
export async function getPersonaByAccount(accountId: string) {
  return db.query.personas.findFirst({ where: eq(personas.accountId, accountId) });
}

export async function upsertPersona(input: { accountId: string; data: Partial<typeof personas.$inferInsert> }) {
  const existing = await getPersonaByAccount(input.accountId);
  const payload = { ...input.data, updatedAt: new Date() };
  if (existing) {
    return db.update(personas).set(payload).where(eq(personas.id, existing.id)).returning();
  }
  return db.insert(personas).values({ accountId: input.accountId, ...payload }).returning();
}

export async function listSegments(personaId: string) {
  return db.query.personaSegments.findMany({
    where: eq(personaSegments.personaId, personaId),
    orderBy: personaSegments.id,
  });
}

export async function replaceSegments(personaId: string, items: typeof personaSegments.$inferInsert[]) {
  await db.delete(personaSegments).where(eq(personaSegments.personaId, personaId));
  return db.insert(personaSegments).values(items).returning();
}

export async function listKeywords(personaId: string) {
  return db.query.personaKeywords.findMany({
    where: eq(personaKeywords.personaId, personaId),
  });
}

export async function replaceKeywords(personaId: string, items: typeof personaKeywords.$inferInsert[]) {
  await db.delete(personaKeywords).where(eq(personaKeywords.personaId, personaId));
  return db.insert(personaKeywords).values(items).returning();
}

// -------------------- Settings placeholders --------------------
export async function getSettingsSnapshot() {
  const [userRows, accountRows] = await Promise.all([
    db.query.users.findMany({ orderBy: [desc(users.createdAt)], limit: 50 }),
    listActiveAccounts(),
  ]);
  return {
    schedule: { weeklyPlanCron: "0 5 * * 0", dailyGenerateCron: "0 6 * * *", hourlyPublishCron: "0 * * * *" },
    notifications: { channels: [] },
    users: userRows.map((u) => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt })),
    // token_encrypted TIDAK PERNAH keluar lewat API meski sudah terenkripsi —
    // design.md §11.1: "status koneksi ... token-nya sendiri tidak pernah
    // ditampilkan balik." UI cuma perlu tahu akun mana yang tersambung.
    accounts: accountRows.map((a) => ({
      id: a.id,
      handle: a.handle,
      igUserId: a.igUserId,
      tokenExpiresAt: a.tokenExpiresAt,
      isActive: a.isActive,
    })),
  };
}
