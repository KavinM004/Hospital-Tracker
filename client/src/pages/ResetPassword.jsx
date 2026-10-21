import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import Logo from "../components/Logo";
import api from "../api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("This password reset link is missing its token.");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError("Your password must be between 8 and 128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const response = await api.post("/auth/reset-password", {
        token,
        password,
      });

      setMessage(response.data.message);

      // Navigate only after the server confirms success.
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset your password. Request a new link and try again.",
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
          <span className="eyebrow">ACCOUNT SECURITY</span>
          <h1>
            Create a
            <br />
            <span>new password.</span>
          </h1>
          <p>Choose a new password to securely access your patient portal.</p>
        </div>
        <div className="story-note">Your care, connected.</div>
      </aside>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <Logo />
          <h2>Reset password</h2>
          <p className="muted">Enter and confirm your new password.</p>

          <form onSubmit={submit} className="form-stack">
            <label>
              New password
              <div className="input-wrap">
                <LockKeyhole size={17} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>
            </label>

            <label>
              Confirm new password
              <div className="input-wrap">
                <LockKeyhole size={17} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter password again"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>
            </label>

            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="alert" role="status">
                {message} Redirecting to login...
              </div>
            )}

            <button
              type="submit"
              className="btn primary full"
              disabled={busy || Boolean(message)}
            >
              {busy ? "Updating..." : "Update password"}
            </button>
          </form>

          <p className="auth-switch">
            <Link to="/login">Back to login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
