"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { MOCK_SETTINGS, MOCK_USERS, type NotifyChannel } from "@/lib/mock/settings";

export function SettingsView() {
  const toast = useToast();
  const [ig, setIg] = useState(MOCK_SETTINGS.ig);
  const [scheduleGenerate, setScheduleGenerate] = useState(MOCK_SETTINGS.scheduleGenerate);
  const [scheduleWindowStart, setScheduleWindowStart] = useState(
    MOCK_SETTINGS.scheduleWindowStart,
  );
  const [scheduleWindowEnd, setScheduleWindowEnd] = useState(MOCK_SETTINGS.scheduleWindowEnd);
  const [brandSavedTag, setBrandSavedTag] = useState("");

  const [notifyChannel, setNotifyChannel] = useState<NotifyChannel>(MOCK_SETTINGS.notifyChannel);
  const [notifyEmail, setNotifyEmail] = useState(MOCK_SETTINGS.notifyEmail);
  const [notifyTelegram, setNotifyTelegram] = useState(MOCK_SETTINGS.notifyTelegram);
  const [notifyOnFailure, setNotifyOnFailure] = useState(MOCK_SETTINGS.notifyOnFailure);
  const [notifyOnTokenExpiry, setNotifyOnTokenExpiry] = useState(
    MOCK_SETTINGS.notifyOnTokenExpiry,
  );
  const [notifySavedTag, setNotifySavedTag] = useState("");

  const [users] = useState(MOCK_USERS);

  function handleReconnect() {
    // TODO: mulai alur OAuth Graph API sungguhan (design.md §8.5) setelah backend siap.
    setIg((prev) => ({ ...prev, connected: true, expiresInDays: 60, lastConnected: "hari ini" }));
    toast("Akun Instagram tersambung ulang. Token baru berlaku 60 hari.");
  }

  const igChipClass = !ig.connected
    ? "chip chip--failed"
    : ig.expiresInDays <= 14
      ? "chip chip--review"
      : "chip chip--approved";
  const igChipLabel = !ig.connected ? "Token kedaluwarsa" : ig.expiresInDays <= 14 ? "Segera kedaluwarsa" : "Terhubung";
  const igMeta = !ig.connected
    ? `Terhubung terakhir ${ig.lastConnected}`
    : `Terhubung sejak ${ig.lastConnected} · token habis dalam ${ig.expiresInDays} hari`;
  const igWarning = !ig.connected
    ? "Token akses sudah tidak valid. Publikasi otomatis berhenti sampai disambungkan ulang."
    : ig.expiresInDays <= 14
      ? `Token akan kedaluwarsa dalam ${ig.expiresInDays} hari. Sambungkan ulang sebelum itu supaya cron publish tidak berhenti mendadak.`
      : null;

  function handleBrandSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: PATCH /api/settings/schedule (design.md §11.1) setelah backend siap.
    setBrandSavedTag("Tersimpan.");
    toast("Brand voice dan jadwal disimpan.");
    setTimeout(() => setBrandSavedTag(""), 2500);
  }

  function handleNotifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: PATCH /api/settings/notifications setelah backend siap.
    setNotifySavedTag("Tersimpan.");
    toast("Pengaturan notifikasi disimpan.");
    setTimeout(() => setNotifySavedTag(""), 2500);
  }

  function handleRevoke(id: string) {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    // TODO: DELETE /api/auth/sessions/:userId (design.md §9) setelah backend siap.
    toast(`Sesi ${user.username} dicabut. Perlu login ulang.`);
  }

  return (
    <section className="view">
      <div className="panel-head">
        <div>
          <h1>Pengaturan</h1>
          <p>
            Yang sering berubah ada di sini. Kredensial sistem (API key, secret Meta) tidak
            ditaruh di UI &mdash; itu dikelola lewat environment variable oleh developer, lihat{" "}
            <code>design.md</code> &sect;11.
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

        <form className="settings-card" onSubmit={handleBrandSubmit}>
          <div className="settings-card__title">Jadwal</div>
          <p className="settings-card__desc">
            Kapan cron generate dan publish jalan. Brand voice sekarang diatur di{" "}
            <Link href="/dashboard/persona" className="text-ultra underline">
              Persona &rarr; DNA
            </Link>
            , supaya tidak ada dua sumber kebenaran.
          </p>

          <div className="field__row">
            <div className="field">
              <label htmlFor="settings-gen-time">Jam generate harian</label>
              <input
                type="time"
                id="settings-gen-time"
                value={scheduleGenerate}
                onChange={(e) => setScheduleGenerate(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Zona waktu</label>
              <input type="text" value="WIB (UTC+7)" disabled style={{ opacity: 0.6 }} />
            </div>
          </div>

          <div className="field__row">
            <div className="field">
              <label htmlFor="settings-window-start">Jendela publish mulai</label>
              <input
                type="time"
                id="settings-window-start"
                value={scheduleWindowStart}
                onChange={(e) => setScheduleWindowStart(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="settings-window-end">Jendela publish sampai</label>
              <input
                type="time"
                id="settings-window-end"
                value={scheduleWindowEnd}
                onChange={(e) => setScheduleWindowEnd(e.target.value)}
              />
            </div>
          </div>
          <p className="field__hint">
            Publish hanya dijalankan di antara dua jam ini, walau post yang disetujui sudah siap
            lebih awal.
          </p>

          <div className="settings-card__foot">
            <button type="submit" className="btn btn--primary btn--sm">
              Simpan
            </button>
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
            <select
              id="settings-notify-channel"
              value={notifyChannel}
              onChange={(e) => setNotifyChannel(e.target.value as NotifyChannel)}
            >
              <option value="email">Email</option>
              <option value="telegram">Telegram</option>
              <option value="none">Tidak ada</option>
            </select>
          </div>

          {notifyChannel === "email" ? (
            <div className="field">
              <label htmlFor="settings-notify-email">Alamat email</label>
              <input
                type="email"
                id="settings-notify-email"
                placeholder="nama@domain.com"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
              />
            </div>
          ) : null}

          {notifyChannel === "telegram" ? (
            <div className="field">
              <label htmlFor="settings-notify-telegram">Telegram chat ID</label>
              <input
                type="text"
                id="settings-notify-telegram"
                placeholder="mis. 123456789"
                value={notifyTelegram}
                onChange={(e) => setNotifyTelegram(e.target.value)}
              />
            </div>
          ) : null}

          <label className="check-row">
            <input
              type="checkbox"
              checked={notifyOnFailure}
              onChange={(e) => setNotifyOnFailure(e.target.checked)}
            />{" "}
            Kirim alert kalau post gagal terbit
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={notifyOnTokenExpiry}
              onChange={(e) => setNotifyOnTokenExpiry(e.target.checked)}
            />{" "}
            Kirim alert kalau token IG &lt;14 hari lagi kedaluwarsa
          </label>

          <div className="settings-card__foot">
            <button type="submit" className="btn btn--primary btn--sm">
              Simpan
            </button>
            <span className="saved-tag">{notifySavedTag}</span>
          </div>
        </form>

        <div className="settings-card">
          <div className="settings-card__title">Pengguna</div>
          <p className="settings-card__desc">
            Akun dibuat lewat CLI oleh admin, bukan lewat form &mdash; sengaja begitu karena
            penggunanya sedikit. Jalankan <code>pnpm cli user:create &lt;username&gt;</code> di
            server untuk menambah orang baru.
          </p>
          <table style={{ marginTop: 16 }}>
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
                  <td className="t-when">{u.lastLogin}</td>
                  <td>
                    {u.isSelf ? (
                      <span className="saved-tag">Ini kamu</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => handleRevoke(u.id)}
                      >
                        Cabut sesi
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
