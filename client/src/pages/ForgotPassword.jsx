import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import Logo from "../components/Logo";
import api from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);

    try {
      const response = await api.post("/auth/forgot-password", {
        email: email.trim(),
      });

      setMessage(response.data.message);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to process your request. Please try again.",
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
          <span className="eyebrow">ACCOUNT RECOVERY</span>
          <h1>
            Get back
            <br />
            <span>to your health hub.</span>
          </h1>
          <p>
            Enter your registered email address to request a password reset
            link.
          </p>
        </div>
        <div className="story-note">Your care, connected.</div>
      </aside>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <Logo />
          <h2>Forgot password?</h2>
          <p className="muted">We'll send you a link to reset your password.</p>

          <form onSubmit={submit} className="form-stack">
            <label>
              Email address
              <div className="input-wrap">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            {message && (
              <div className="alert" role="status">
                {message}
              </div>
            )}

            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="btn primary full" disabled={busy}>
              {busy ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="auth-switch">
            Remember your password? <Link to="/login">Back to login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}