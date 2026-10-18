import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import GoogleButton from "../components/GoogleButton";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      {/* Patient login branding */}
      <aside className="auth-story">
        <Logo />

        <div className="story-content">
          <span className="eyebrow">YOUR CARE, CONNECTED</span>

          <h1>
            Welcome back
            <br />
            <span>to your health hub.</span>
          </h1>

          <p>
            Access your patient visits, registration details and appointment
            tokens whenever you need them.
          </p>

          <ul>
            <li>Simple patient dashboard</li>
            <li>Transparent consultation fees</li>
            <li>Downloadable token sheets</li>
          </ul>
        </div>

        <div className="story-note">Trusted care starts here.</div>
      </aside>

      {/* Patient login form */}
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <Logo />

          <h2>Welcome back</h2>
          <p className="muted">Sign in to continue to your patient portal.</p>

          <div className="google-area">
            <GoogleButton onError={setError} />
          </div>

          <div className="or-divider">
            <span>or continue with email</span>
          </div>

          <form onSubmit={submit} className="form-stack">
            <label>
              Email address
              <div className="input-wrap">
                <Mail size={17} />

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  autoComplete="email"
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
                  placeholder="Enter your password"
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

            <button type="submit" className="btn primary full" disabled={busy}>
              {busy ? "Signing in..." : "Sign in securely"}
            </button>
          </form>

          {/* Patient registration link */}
          <p className="auth-switch">
            New to MediCare? <Link to="/signup">Create an account</Link>
          </p>

          {/* Switch to admin login */}
          <p className="auth-switch admin-switch">
            Hospital administrator?{" "}
            <Link to="/admin/login">Sign in as Admin</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
