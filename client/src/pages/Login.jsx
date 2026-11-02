import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, Phone } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import GoogleButton from "../components/GoogleButton";

export default function Login() {
  const { login, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("email");
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function normalizePhone(value) {
    const cleaned = value.trim().replace(/[\s()-]/g, "");

    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }

    if (/^91[6-9]\d{9}$/.test(cleaned)) {
      return `+${cleaned}`;
    }

    if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
      return cleaned;
    }

    return null;
  }

  async function submitEmail(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPhone(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const normalizedPhone = normalizePhone(phone);

      if (!normalizedPhone) {
        setError("Enter a valid 10-digit Indian mobile number.");
        return;
      }

      await sendOtp(normalizedPhone);

      setPhone(normalizedPhone);
      setOtpSent(true);
      setNotice("OTP sent. Please check your phone.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const normalizedPhone = normalizePhone(phone);

      if (!normalizedPhone) {
        setError("Enter a valid mobile number.");
        return;
      }

      await verifyOtp(normalizedPhone, code.trim());
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
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

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <Logo />
          <h2>Welcome back</h2>
          <p className="muted">Sign in to continue to your patient portal.</p>
          <div className="google-area">
            <GoogleButton onError={setError} />
          </div>
          <div className="or-divider">
            <span>or sign in with</span>
          </div>
  
          <div className="login-method-switch">
            <button
              type="button"
              className={`login-method-btn ${mode === "email" ? "active" : ""}`}
              onClick={() => {
                setMode("email");
                setError("");
                setNotice("");
              }}
            >
              <Mail size={17} />
              <span>Email</span>
            </button>

            <button
              type="button"
              className={`login-method-btn ${mode === "phone" ? "active" : ""}`}
              onClick={() => {
                setMode("phone");
                setError("");
                setNotice("");
              }}
            >
              <Phone size={17} />
              <span>Phone OTP</span>
            </button>
          </div>
  
          {mode === "email" ? (
            <form onSubmit={submitEmail} className="form-stack">
              <label>
                Email address
                <div className="input-wrap">
                  <Mail size={17} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
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

              <div className="flex justify-end -mt-2">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {error && (
                <div className="alert error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn primary full"
                disabled={busy}
              >
                {busy ? "Signing in..." : "Sign in securely"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={otpSent ? submitCode : submitPhone}
              className="form-stack"
            >
              <label>
                Mobile number
                <div className="input-wrap">
                  <Phone size={17} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setOtpSent(false);
                      setCode("");
                      setError("");
                      setNotice("");
                    }}
                    placeholder="Enter your 10-digit mobile number"
                    autoComplete="tel"
                    required
                    disabled={busy || otpSent}
                  />
                </div>
              </label>

              {otpSent && (
                <label>
                  Verification code
                  <div className="input-wrap">
                    <LockKeyhole size={17} />
                    <input
                      type="text"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      placeholder="Enter the OTP you received"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                </label>
              )}

              {error && (
                <div className="alert error" role="alert">
                  {error}
                </div>
              )}

              {notice && (
                <div className="alert" role="status">
                  {notice}
                </div>
              )}

              <button
                type="submit"
                className="btn primary full"
                disabled={busy}
              >
                {busy
                  ? "Please wait..."
                  : otpSent
                    ? "Verify OTP & Sign in"
                    : "Send OTP"}
              </button>

              {otpSent && (
                <button
                  type="button"
                  className="btn full"
                  disabled={busy}
                  onClick={() => {
                    setOtpSent(false);
                    setCode("");
                    setError("");
                    setNotice("");
                  }}
                >
                  Change phone number
                </button>
              )}
            </form>
          )}
          <p className="auth-switch">
            New to MediCare? <Link to="/signup">Create an account</Link>
          </p>
          <p className="auth-switch admin-switch">
            Hospital administrator?{" "}
            <Link to="/admin/login">Sign in as Admin</Link>
          </p>
        </div>
      </section>
    </main>
  );
}