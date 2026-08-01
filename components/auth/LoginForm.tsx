"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Isi username dan password dulu.");
      (username.trim() ? passwordRef : usernameRef).current?.focus();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal masuk");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth__form" noValidate onSubmit={handleSubmit}>
      <h2>Masuk</h2>
      <p className="auth__hint">Lanjutkan ke akun Postpress.</p>

      <div className="field">
        <label htmlFor="username">Username</label>
        <input
          ref={usernameRef}
          type="text"
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          ref={passwordRef}
          type="password"
          id="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error ? (
        <p className="alert" role="alert">{error}</p>
      ) : null}

      <div className="auth__submit">
        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? "Masuk..." : "Masuk"}
        </button>
      </div>
      <p className="auth__note">Akun dibuat oleh admin. Belum punya akses? Minta admin membuatkan.</p>
    </form>
  );
}
