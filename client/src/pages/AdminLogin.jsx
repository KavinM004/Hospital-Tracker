import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      await adminLogin(form);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Admin login failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <Logo />
        <div className="story-content">
          <span className="eyebrow">
            <ShieldCheck size={16} />
            SECURE ADMINISTRATION
          </span>
          <h1>
            Hospital operations,
            <br />
            <span>all in one place.</span>
          </h1>
          <p>
            Manage doctors, patient admissions and payments from your
            administration dashboard.
          </p>
        </div>
      </aside>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <Logo />
          <h2>Administrator login</h2>
          <p className="muted">
            Sign in with your hospital administrator account.
          </p>

          <form className="form-stack" onSubmit={submit}>
            <label>
              Admin email
              <div className="input-wrap">
                <Mail size={17} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@hospital.com"
                  autoComplete="username"
                  required
                />
              </div>
            </label>

            <label>
              Password
              <div className="input-wrap">
                <LockKeyhole size={17} />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>

            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}

            <button className="btn primary full" type="submit" disabled={busy}>
              {busy ? "Signing in..." : "Sign in as administrator"}
            </button>
          </form>

          <p className="auth-switch">
            <Link to="/login">Return to patient login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
