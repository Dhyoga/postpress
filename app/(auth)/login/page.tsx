import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__mark eyebrow">Postpress</div>
        <div className="fan" aria-hidden="true">
          <div className="fan__card" />
          <div className="fan__card" />
          <div className="fan__card">
            <div className="fan__eyebrow eyebrow">Panduan</div>
            <div className="fan__title">5 kesalahan freelancer pemula</div>
            <div className="fan__sub">Yang bikin kamu kerja keras tapi tetap kere</div>
          </div>
        </div>
        <div className="auth__lede">
          <h1>Satu proof sheet tiap pagi. Kamu tinggal bilang ya.</h1>
          <p>
            Postpress menyusun rencana konten, menulis tiap slide, dan merender carousel siap
            tayang. Yang tersisa buat kamu cuma satu tombol.
          </p>
        </div>
        <div className="auth__foot">1080 &times; 1350 &middot; 4:5 &middot; JPEG</div>
      </aside>

      <main className="auth__panel">
        <LoginForm />
      </main>
    </div>
  );
}
