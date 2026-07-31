export type NotifyChannel = "email" | "telegram" | "none";

export type IgAccountStatus = {
  handle: string;
  connected: boolean;
  expiresInDays: number;
  lastConnected: string;
};

export type SettingsState = {
  ig: IgAccountStatus;
  scheduleGenerate: string;
  scheduleWindowStart: string;
  scheduleWindowEnd: string;
  notifyChannel: NotifyChannel;
  notifyEmail: string;
  notifyTelegram: string;
  notifyOnFailure: boolean;
  notifyOnTokenExpiry: boolean;
};

export type UserRole = "admin" | "editor";

export type UserRow = {
  id: string;
  username: string;
  role: UserRole;
  lastLogin: string;
  isSelf: boolean;
};

// TODO: ganti ke query DB (tabel ig_accounts, users) via lib/db/queries/ setelah Supabase siap.
export const MOCK_SETTINGS: SettingsState = {
  ig: { handle: "@kelasfreelance.id", connected: true, expiresInDays: 11, lastConnected: "2 Jul 2026" },
  scheduleGenerate: "06:00",
  scheduleWindowStart: "08:00",
  scheduleWindowEnd: "22:00",
  notifyChannel: "email",
  notifyEmail: "rangga@kelasfreelance.id",
  notifyTelegram: "",
  notifyOnFailure: true,
  notifyOnTokenExpiry: true,
};

export const MOCK_USERS: UserRow[] = [
  { id: "u1", username: "rangga", role: "admin", lastLogin: "31 Jul 2026, 09:12", isSelf: true },
  { id: "u2", username: "dinda", role: "editor", lastLogin: "29 Jul 2026, 14:03", isSelf: false },
];
