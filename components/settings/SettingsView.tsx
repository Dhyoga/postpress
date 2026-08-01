"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { FieldError } from "@/components/ui/FieldError";
import { useApi, usePostMutation } from "@/lib/hooks/use-api";

const DEFAULT_SCHEDULE = { weeklyPlanCron: "0 5 * * 0", dailyGenerateCron: "0 6 * * *", hourlyPublishCron: "0 * * * *" };

type SettingsSnapshot = {
  schedule: { weeklyPlanCron: string; dailyGenerateCron: string; hourlyPublishCron: string };
  notifications: {
    channels: string[];
    email?: string;
    telegram?: string;
    onFailure?: boolean;
    onTokenExpiry?: boolean;
  };
  users: Array<{ id: string; username: string; role: string; lastLogin?: string | null }>;
  accounts: Array<{ id: string; handle: string; igUserId: string }>;
};

type IgSettings = {
  connected: boolean;
  handle: string;
  lastConnected?: string;
  expiresInDays?: number | null;
};

export function SettingsView() {
  const toast = useToast();
  const { data: settings, loading, refetch } = useApi<SettingsSnapshot>("/api/settings");
  const saveMutation = usePostMutation<SettingsSnapshot, SettingsSnapshot>();
  const reconnectMutation = usePostMutation<{ accountId: string }, { accountId: string }>();

  const [scheduleGenerate, setScheduleGenerate] = useState("06:00");
  const [scheduleWindowStart, setScheduleWindowStart] = useState("08:00");
  const [scheduleWindowEnd, setScheduleWindowEnd] = useState("21:00");
  const [brandSavedTag, setBrandSavedTag] = useState("");
  const [scheduleErrors, setScheduleErrors] = useState<{ window?: string }>({});

  const [notifyChannel, setNotifyChannel] = useState("none");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyTelegram, setNotifyTelegram] = useState("");
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [notifyOnTokenExpiry, setNotifyOnTokenExpiry] = useState(true);
  const [notifySavedTag, setNotifySavedTag] = useState("");
  const [notifyErrors, setNotifyErrors] = useState<{ email?: string; telegram?: string }>({});

  const [ig, setIg] = useState<IgSettings>({ connected: false, handle: "@kelasfreelance.id", lastConnected: "-", expiresInDays: null });
  const users = settings?.users ?? [];

  useEffect(() => {
    if (settings?.schedule) {
      const toMinutes = (cron: string) => {
        const m = cron.match(/(\d{1,2}):(\d{2})/);
        if (!m) return 0;
        return Number(m[1]) * 60 + Number(m[2]);
      };
      const start = toMinutes(settings.schedule.dailyGenerateCron);
      setScheduleGenerate(`${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`);
    }
  }, [settings]);

  function handleReconnect() {
    const account = settings?.accounts?.[0];
    if (!account) {
      toast("Belum ada akun IG.");
      return;
    }
    reconnectMutation.mutate("/api/settings/reconnect", { accountId: account.id }).then((res) => {
      if (res) {
        setIg((prev) => ({ ...prev, connected: true, expiresInDays: 60, lastConnected: "hari ini" }));
        toast("Akun Instagram tersambung ulang. Token baru berlaku 60 hari.");
      } else {
        toast("Gagal reconnect akun.");
      }
    });
  }

  function handleBrandSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors: { window?: string } = {};
    if (scheduleWindowStart >= scheduleWindowEnd) {
      nextErrors.window = "Jam mulai jendela publikasi harus lebih awal dari jam selesai.";
    }
    setScheduleErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveMutation.mutate("/api/settings", {
      schedule: { ...(settings?.schedule ?? DEFAULT_SCHEDULE), dailyGenerateCron: `${scheduleGenerate}:00` },
      notifications: settings?.notifications ?? { channels: [] },
      users: settings?.users ?? [],
      accounts: settings?.accounts ?? [],
    }).then((res) => {
      if (res) {
        setBrandSavedTag("Tersimpan.");
        toast("Jadwal disimpan.");
        setTimeout(() => setBrandSavedTag(""), 2500);
      }
    });
  }

  function handleNotifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors: { email?: string; telegram?: string } = {};
    if (notifyChannel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail.trim())) {
      nextErrors.email = "Isi alamat email yang valid, mis. nama@domain.com.";
    }
    if (notifyChannel === "telegram" && !/^-?\d+$/.test(notifyTelegram.trim())) {
      nextErrors.telegram = "Chat ID Telegram harus berupa angka, mis. 123456789.";
    }
    setNotifyErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveMutation.mutate("/api/settings", {
      schedule: settings?.schedule ?? DEFAULT_SCHEDULE,
      notifications: { channels: [notifyChannel], email: notifyEmail, telegram: notifyTelegram, onFailure: notifyOnFailure, onTokenExpiry: notifyOnTokenExpiry },
      users: settings?.users ?? [],
      accounts: settings?.accounts ?? [],
    }).then((res) => {
      if (res) {
        setNotifySavedTag("Tersimpan.");
        toast("Pengaturan notifikasi disimpan.");
        setTimeout(() => setNotifySavedTag(""), 2500);
      }
    });
  }

  function handleRevoke(id: string) {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    toast(`Sesi ${user.username} dicabut. Perlu login ulang.`);
  }

  const igChipClass = !ig.connected ? "chip chip--failed" : (ig.expiresInDays ?? 999) <= 14 ? "chip chip--review" : "chip chip--approved";
  const igChipLabel = !ig.connected ? "Token kedaluwarsa" : (ig.expiresInDays ?? 999) <= 14 ? "Segera kedaluwarsa" : "Terhubung";
  const igMeta = !ig.connected ? `Terhubung terakhir ${ig.lastConnected}` : `Terhubung sejak ${ig.lastConnected} · token habis dalam ${ig.expiresInDays} hari`;
  const igWarning = !ig.connected ? "Token akses sudah tidak valid. Publikasi otomatis berhenti sampai disambungkan ulang." : (ig.expiresInDays ?? 999) <= 14 ? `Token akan kedaluwarsa dalam ${ig.expiresInDays} hari. Sambungkan ulang sebelum itu supaya publikasi otomatis tidak berhenti mendadak.` : null;

  return (
    <section className="view">
      <div className="panel-head">
        <div>
          <h1>Pengaturan</h1>
          <p>
            Yang sering berubah ada di sini. Kredensial sistem (API key, secret Meta) tidak
            ditaruh di UI — itu dikelola lewat environment variable oleh developer, lihat{" "}
            <code>design.md</code> §11.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card__title">Akun Instagram</div>
          <p className="settings-card__desc">
            Akun yang dipakai untuk publikasi otomatis. Token disimpan terenkripsi di server,
            tidak pernah ditampilkan di sini.
          </p>
          <div className="status-row" style={{ marginTop: 16 }}>
            <div>
              <div className="status-row__label">{ig.handle}</div>
              <div className="status-row__meta">{igMeta}</div>
            </div>
            <span className={igChipClass}>{igChipLabel}</span>
          </div>
          {igWarning ? <p className="alert">{igWarning}</p> : null}
          <div className="settings-card__foot">
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleReconnect}>
              Sambungkan ulang
            </button>
          </div>
        </div>

        <form className="settings-card" onSubmit={handleBrandSubmit} noValidate>
          <div className="settings-card__title">Jadwal</div>
          <p className="settings-card__desc">
            Kapan cron generate dan publikasi jalan. Brand voice sekarang diatur di{" "}
            <Link href="/dashboard/persona" className="text-ultra underline">
              Persona → DNA
            </Link>
            , supaya tidak ada dua sumber kebenaran.
          </p>

          <div className="field__row">
            <div className="field">
              <label htmlFor="settings-gen-time">Jam generate harian</label>
              <input type="time" id="settings-gen-time" value={scheduleGenerate} onChange={(e) => setScheduleGenerate(e.target.value)} />
            </div>
            <div className="field">
              <label>Zona waktu</label>
              <input type="text" value="WIB (UTC+7)" disabled style={{ opacity: 0.6 }} />
            </div>
          </div>

          <div className="field__row">
            <div className="field">
              <label htmlFor="settings-window-start">Jendela publikasi mulai</label>
              <input type="time" id="settings-window-start" className={scheduleErrors.window ? "border-magenta" : undefined} value={scheduleWindowStart} onChange={(e) => setScheduleWindowStart(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="settings-window-end">Jendela publikasi sampai</label>
              <input type="time" id="settings-window-end" className={scheduleErrors.window ? "border-magenta" : undefined} value={scheduleWindowEnd} onChange={(e) => setScheduleWindowEnd(e.target.value)} />
            </div>
          </div>
          {scheduleErrors.window ? <FieldError message={scheduleErrors.window} /> : (
            <p className="field__hint">
              Publikasi hanya dijalankan di antara dua jam ini, walau post yang disetujui sudah
              siap lebih awal.
            </p>
          )}

          <div className="settings-card__foot">
            <button type="submit" className="btn btn--primary btn--sm">Simpan</button>
            <span className="saved-tag">{brandSavedTag}</span>
          </div>
        </form>

        <form className="settings-card" onSubmit={handleNotifySubmit}>
          <div className="settings-card__title">Notifikasi</div>
          <p className="settings-card__desc">
            Ke mana alert dikirim kalau job gagal atau token mau kedaluwarsa.
          </p>

          <div className="field">
            <label htmlFor="settings-notify-channel">Kanal</label>
            <select id="settings-notify-channel" value={notifyChannel} onChange={(e) => setNotifyChannel(e.target.value)}>
              <option value="email">Email</option>
              <option value="telegram">Telegram</option>
              <option value="none">Tidak ada</option>
            </select>
          </div>

          {notifyChannel === "email" ? (
            <div className="field">
              <label htmlFor="settings-notify-email">Alamat email</label>
              <input type="email" id="settings-notify-email" placeholder="nama@domain.com" value={notifyEmail} className={notifyErrors.email ? "border-magenta" : undefined} onChange={(e) => setNotifyEmail(e.target.value)} />
              <FieldError message={notifyErrors.email} />
            </div>
          ) : null}

          {notifyChannel === "telegram" ? (
            <div className="field">
              <label htmlFor="settings-notify-telegram">Telegram chat ID</label>
              <input type="text" id="settings-notify-telegram" placeholder="mis. 123456789" value={notifyTelegram} className={notifyErrors.telegram ? "border-magenta" : undefined} onChange={(e) => setNotifyTelegram(e.target.value)} />
              <FieldError message={notifyErrors.telegram} />
            </div>
          ) : null}

          <label className="check-row">
            <input type="checkbox" checked={notifyOnFailure} onChange={(e) => setNotifyOnFailure(e.target.checked)} />
            {" "}Kirim alert kalau post gagal terbit
          </label>
          <label className="check-row">
            <input type="checkbox" checked={notifyOnTokenExpiry} onChange={(e) => setNotifyOnTokenExpiry(e.target.checked)} />
            {" "}Kirim alert kalau token IG kurang dari 14 hari lagi kedaluwarsa
          </label>

          <div className="settings-card__foot">
            <button type="submit" className="btn btn--primary btn--sm">Simpan</button>
            <span className="saved-tag">{notifySavedTag}</span>
          </div>
        </form>

        <div className="settings-card">
          <div className="settings-card__title">Pengguna</div>
          <p className="settings-card__desc">
            Akun dibuat lewat CLI oleh admin, bukan lewat form — sengaja begitu karena
            penggunanya sedikit. Jalankan <code>pnpm cli user:create &lt;username&gt;</code> di
            server untuk menambah orang baru.
          </p>
          <div className="table-scroll" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th className="hide-sm">Peran</th>
                  <th>Login terakhir</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="t-topic">{u.username}</td>
                    <td className="hide-sm t-type">{u.role}</td>
                    <td className="t-when">{u.lastLogin ?? "-"}</td>
                    <td>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => handleRevoke(u.id)}>
                        Cabut sesi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
