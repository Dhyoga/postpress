"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { FieldError } from "@/components/ui/FieldError";
import { useApi, usePostMutation } from "@/lib/hooks/use-api";
import { DEFAULT_BASE_URLS, type LlmProvider } from "@/lib/llm/providers";

const DEFAULT_SCHEDULE = { weeklyPlanCron: "0 5 * * 0", dailyGenerateCron: "0 6 * * *", hourlyPublishCron: "0 * * * *" };

const LLM_PROVIDER_LABELS: Record<LlmProvider, string> = {
  mistral: "Mistral (resmi)",
  gemini: "Gemini (resmi)",
  claude: "Claude (lewat token router, mis. agentrouter/tokenrouter)",
};

const LLM_MODEL_PLACEHOLDER: Record<LlmProvider, string> = {
  mistral: "mistral-large-latest",
  gemini: "gemini-2.5-pro",
  claude: "claude-opus-5",
};

type LlmSettingsView = {
  provider: LlmProvider;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  source: "database" | "env" | "none";
  updatedAt: string | null;
};

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

type IgAccountView = {
  id: string;
  handle: string;
  igUserId: string;
  tokenExpiresAt: string | null;
  isActive: boolean;
};

type ConnectIgBody = {
  accountId?: string;
  handle: string;
  igUserId: string;
  accessToken: string;
  neverExpires: boolean;
  expiresInDays?: number;
};

const EMPTY_CONNECT_FORM = { accountId: undefined as string | undefined, handle: "", igUserId: "", accessToken: "", neverExpires: true, expiresInDays: 60 };

export function SettingsView() {
  const toast = useToast();
  const { data: settings, loading, refetch } = useApi<SettingsSnapshot>("/api/settings");
  const saveMutation = usePostMutation<SettingsSnapshot, SettingsSnapshot>();
  const { data: igData, refetch: refetchIgAccounts } = useApi<{ accounts: IgAccountView[] }>("/api/settings/ig-accounts");
  const connectMutation = usePostMutation<ConnectIgBody, { account: IgAccountView }>();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const { data: llmSettings, refetch: refetchLlm } = useApi<LlmSettingsView>("/api/settings/llm");
  const [llmProvider, setLlmProvider] = useState<LlmProvider>("mistral");
  const [llmBaseUrl, setLlmBaseUrl] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmSavedTag, setLlmSavedTag] = useState("");
  const [llmErrors, setLlmErrors] = useState<{ baseUrl?: string; model?: string; apiKey?: string }>({});

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

  const [igFormOpen, setIgFormOpen] = useState(false);
  const [igForm, setIgForm] = useState(EMPTY_CONNECT_FORM);
  const [igFormErrors, setIgFormErrors] = useState<{ handle?: string; igUserId?: string; accessToken?: string }>({});

  const users = settings?.users ?? [];
  const igAccounts = igData?.accounts ?? [];
  const activeAccount = igAccounts.find((a) => a.isActive) ?? null;

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

  useEffect(() => {
    if (!llmSettings) return;
    setLlmProvider(llmSettings.provider);
    setLlmBaseUrl(llmSettings.baseUrl);
    setLlmModel(llmSettings.model);
  }, [llmSettings]);

  function handleLlmProviderChange(next: LlmProvider) {
    setLlmProvider(next);
    setLlmBaseUrl((prev) => (prev.trim() ? prev : DEFAULT_BASE_URLS[next]));
  }

  async function handleLlmSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors: { baseUrl?: string; model?: string; apiKey?: string } = {};
    if (!llmBaseUrl.trim()) nextErrors.baseUrl = "Base URL wajib diisi.";
    if (!llmModel.trim()) nextErrors.model = "Nama model wajib diisi.";
    if (!llmSettings?.hasApiKey && !llmApiKey.trim()) nextErrors.apiKey = "API key wajib diisi untuk konfigurasi baru.";
    setLlmErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLlmSaving(true);
    try {
      const res = await fetch("/api/settings/llm", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: llmProvider,
          baseUrl: llmBaseUrl.trim(),
          model: llmModel.trim(),
          apiKey: llmApiKey.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        toast("Konfigurasi LLM disimpan.");
        setLlmApiKey("");
        setLlmSavedTag("Tersimpan.");
        setTimeout(() => setLlmSavedTag(""), 2500);
        refetchLlm();
      } else {
        toast((json as { error?: string } | null)?.error || "Gagal menyimpan konfigurasi LLM.");
      }
    } finally {
      setLlmSaving(false);
    }
  }

  function openConnectForm(account?: IgAccountView) {
    setIgFormErrors({});
    setIgForm(
      account
        ? { accountId: account.id, handle: account.handle, igUserId: account.igUserId, accessToken: "", neverExpires: true, expiresInDays: 60 }
        : EMPTY_CONNECT_FORM,
    );
    setIgFormOpen(true);
  }

  function handleIgFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors: { handle?: string; igUserId?: string; accessToken?: string } = {};
    if (!igForm.handle.trim()) nextErrors.handle = "Handle Instagram wajib diisi.";
    if (!igForm.igUserId.trim()) nextErrors.igUserId = "IG User ID wajib diisi.";
    if (igForm.accessToken.trim().length < 10) nextErrors.accessToken = "Token akses tidak valid.";
    setIgFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    connectMutation
      .mutate("/api/settings/connect-ig", {
        accountId: igForm.accountId,
        handle: igForm.handle.trim(),
        igUserId: igForm.igUserId.trim(),
        accessToken: igForm.accessToken.trim(),
        neverExpires: igForm.neverExpires,
        expiresInDays: igForm.neverExpires ? undefined : igForm.expiresInDays,
      })
      .then((res) => {
        if (res) {
          toast(`Akun @${res.account.handle} tersambung.`);
          setIgFormOpen(false);
          setIgForm(EMPTY_CONNECT_FORM);
          refetchIgAccounts();
        } else {
          toast("Gagal menyambungkan akun Instagram.");
        }
      });
  }

  async function handleDisconnect(account: IgAccountView) {
    setDisconnecting(account.id);
    try {
      const res = await fetch("/api/settings/connect-ig", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });
      if (res.ok) {
        toast(`Akun @${account.handle} diputuskan.`);
        refetchIgAccounts();
      } else {
        toast("Gagal memutuskan koneksi akun.");
      }
    } finally {
      setDisconnecting(null);
    }
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

  const expiresInDays = activeAccount?.tokenExpiresAt
    ? Math.floor((new Date(activeAccount.tokenExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;
  const igChipClass = !activeAccount ? "chip chip--failed" : (expiresInDays ?? 999) <= 14 ? "chip chip--review" : "chip chip--approved";
  const igChipLabel = !activeAccount ? "Belum tersambung" : (expiresInDays ?? 999) <= 14 ? "Segera kedaluwarsa" : "Terhubung";
  const igMeta = !activeAccount
    ? "Belum ada akun Instagram yang tersambung."
    : activeAccount.tokenExpiresAt
      ? `IG User ID ${activeAccount.igUserId} · token habis dalam ${expiresInDays} hari`
      : `IG User ID ${activeAccount.igUserId} · token tidak pernah kedaluwarsa (System User token)`;
  const igWarning = !activeAccount
    ? "Belum ada akun Instagram yang tersambung. Publikasi otomatis tidak akan berjalan sampai satu akun disambungkan."
    : (expiresInDays ?? 999) <= 14
      ? `Token akan kedaluwarsa dalam ${expiresInDays} hari. Sambungkan ulang sebelum itu supaya publikasi otomatis tidak berhenti mendadak.`
      : null;
  const disconnectedAccounts = igAccounts.filter((a) => !a.isActive);

  return (
    <section className="view">
      <div className="panel-head">
        <div>
          <h1>Pengaturan</h1>
          <p>
            Yang sering berubah ada di sini. Kredensial provider LLM bisa diatur lewat form di
            bawah; kredensial sistem lain (secret Meta) tetap dikelola lewat environment variable
            oleh developer, lihat <code>design.md</code> §11.
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
              <div className="status-row__label">{activeAccount ? `@${activeAccount.handle}` : "Tidak ada akun"}</div>
              <div className="status-row__meta">{igMeta}</div>
            </div>
            <span className={igChipClass}>{igChipLabel}</span>
          </div>
          {igWarning ? <p className="alert">{igWarning}</p> : null}

          {disconnectedAccounts.length > 0 ? (
            <div className="table-scroll" style={{ marginTop: 12 }}>
              {disconnectedAccounts.map((a) => (
                <div key={a.id} className="status-row">
                  <div>
                    <div className="status-row__label">@{a.handle}</div>
                    <div className="status-row__meta">Terputus · IG User ID {a.igUserId}</div>
                  </div>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openConnectForm(a)}>
                    Sambungkan ulang
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {igFormOpen ? (
            <form className="field" style={{ marginTop: 16 }} onSubmit={handleIgFormSubmit} noValidate>
              <div className="field">
                <label htmlFor="ig-handle">Handle Instagram</label>
                <input
                  type="text"
                  id="ig-handle"
                  placeholder="namaakun"
                  value={igForm.handle}
                  className={igFormErrors.handle ? "border-magenta" : undefined}
                  onChange={(e) => setIgForm((p) => ({ ...p, handle: e.target.value }))}
                />
                <FieldError message={igFormErrors.handle} />
              </div>
              <div className="field">
                <label htmlFor="ig-user-id">IG User ID (Business Account)</label>
                <input
                  type="text"
                  id="ig-user-id"
                  placeholder="17841400..."
                  value={igForm.igUserId}
                  className={igFormErrors.igUserId ? "border-magenta" : undefined}
                  onChange={(e) => setIgForm((p) => ({ ...p, igUserId: e.target.value }))}
                />
                <FieldError message={igFormErrors.igUserId} />
              </div>
              <div className="field">
                <label htmlFor="ig-token">Token akses</label>
                <input
                  type="password"
                  id="ig-token"
                  placeholder="Token System User atau long-lived user token"
                  value={igForm.accessToken}
                  className={igFormErrors.accessToken ? "border-magenta" : undefined}
                  onChange={(e) => setIgForm((p) => ({ ...p, accessToken: e.target.value }))}
                />
                <FieldError message={igFormErrors.accessToken} />
              </div>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={igForm.neverExpires}
                  onChange={(e) => setIgForm((p) => ({ ...p, neverExpires: e.target.checked }))}
                />
                {" "}Token System User (tidak pernah kedaluwarsa)
              </label>
              {!igForm.neverExpires ? (
                <div className="field">
                  <label htmlFor="ig-expires">Token berlaku (hari)</label>
                  <input
                    type="number"
                    id="ig-expires"
                    min={1}
                    max={60}
                    value={igForm.expiresInDays}
                    onChange={(e) => setIgForm((p) => ({ ...p, expiresInDays: Number(e.target.value) }))}
                  />
                </div>
              ) : null}
              <div className="settings-card__foot">
                <button type="submit" className="btn btn--primary btn--sm" disabled={connectMutation.loading}>
                  {connectMutation.loading ? "Menyambungkan…" : "Simpan"}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setIgFormOpen(false)}>
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <div className="settings-card__foot">
              {activeAccount ? (
                <>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openConnectForm(activeAccount)}>
                    Sambungkan ulang
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => handleDisconnect(activeAccount)}
                    disabled={disconnecting === activeAccount.id}
                  >
                    {disconnecting === activeAccount.id ? "Memutuskan…" : "Putuskan koneksi"}
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn--primary btn--sm" onClick={() => openConnectForm()}>
                  Hubungkan akun Instagram
                </button>
              )}
            </div>
          )}
        </div>

        <form className="settings-card" onSubmit={handleLlmSubmit} noValidate>
          <div className="settings-card__title">Konfigurasi LLM</div>
          <p className="settings-card__desc">
            Provider yang dipakai untuk generate rencana konten &amp; copy. API key disimpan
            terenkripsi di server dan tidak pernah ditampilkan balik.
          </p>
          {llmSettings?.source === "env" ? (
            <p className="field__hint">
              Belum ada konfigurasi tersimpan di database — sekarang memakai fallback dari{" "}
              <code>.env</code>. Simpan lewat form ini untuk mengelolanya dari sini.
            </p>
          ) : null}

          <div className="field">
            <label htmlFor="llm-provider">Provider</label>
            <select
              id="llm-provider"
              value={llmProvider}
              onChange={(e) => handleLlmProviderChange(e.target.value as LlmProvider)}
            >
              <option value="mistral">{LLM_PROVIDER_LABELS.mistral}</option>
              <option value="gemini">{LLM_PROVIDER_LABELS.gemini}</option>
              <option value="claude">{LLM_PROVIDER_LABELS.claude}</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="llm-base-url">Base URL</label>
            <input
              type="text"
              id="llm-base-url"
              placeholder={DEFAULT_BASE_URLS[llmProvider]}
              value={llmBaseUrl}
              className={llmErrors.baseUrl ? "border-magenta" : undefined}
              onChange={(e) => setLlmBaseUrl(e.target.value)}
            />
            <FieldError message={llmErrors.baseUrl} />
          </div>

          <div className="field">
            <label htmlFor="llm-model">Model</label>
            <input
              type="text"
              id="llm-model"
              placeholder={LLM_MODEL_PLACEHOLDER[llmProvider]}
              value={llmModel}
              className={llmErrors.model ? "border-magenta" : undefined}
              onChange={(e) => setLlmModel(e.target.value)}
            />
            <FieldError message={llmErrors.model} />
          </div>

          <div className="field">
            <label htmlFor="llm-api-key">API key</label>
            <input
              type="password"
              id="llm-api-key"
              placeholder={llmSettings?.hasApiKey ? "Kosongkan untuk pertahankan yang tersimpan" : "Wajib diisi"}
              value={llmApiKey}
              className={llmErrors.apiKey ? "border-magenta" : undefined}
              onChange={(e) => setLlmApiKey(e.target.value)}
            />
            <FieldError message={llmErrors.apiKey} />
          </div>

          <div className="settings-card__foot">
            <button type="submit" className="btn btn--primary btn--sm" disabled={llmSaving}>
              {llmSaving ? "Menyimpan…" : "Simpan"}
            </button>
            <span className="saved-tag">{llmSavedTag}</span>
          </div>
        </form>

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
