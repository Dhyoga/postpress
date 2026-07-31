"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showError, setShowError] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setShowError(true);
      (username.trim() ? passwordRef.current : usernameRef.current)?.focus();
      return;
    }
    setShowError(false);
    // TODO: ganti ke POST /api/auth/login (bcrypt + cookie sesi httpOnly, design.md §9)
    // begitu backend auth dibangun. Untuk sekarang cukup redirect ke dashboard supaya
    // seluruh alur UI bisa dilihat tanpa sesi sungguhan.
    router.push("/dashboard");
  }

  return (
    <form className="auth__form" noValidate onSubmit={handleSubmit}>
      <h2>Masuk</h2>
      <p className="auth__hint">Lanjutkan ke akun @kelasfreelance.id.</p>

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

      {showError ? (
        <p className="alert" role="alert">
          Isi username dan password dulu.
        </p>
      ) : null}

      <div className="auth__submit">
        <button type="submit" className="btn btn--primary btn--block">
          Masuk
        </button>
      </div>
      <p className="auth__note">Akun dibuat oleh admin. Belum punya akses? Minta admin membuatkan.</p>
      <p className="auth__demo">Prototipe &mdash; isi apa saja untuk melihat dashboard.</p>
    </form>
  );
}
