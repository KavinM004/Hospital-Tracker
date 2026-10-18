import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import GoogleButton from "../components/GoogleButton";

export default function Signup() {
  const { register } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try { await register(form); navigate("/dashboard"); }
    catch (err) { setError(err.response?.data?.message || "Could not create your account."); }
    finally { setBusy(false); }
  }
  return <main className="auth-layout"><aside className="auth-story"><Logo/><div className="story-content"><span className="eyebrow">WELCOME TO BETTER CARE</span><h1>Healthcare,<br/><span>without the hassle.</span></h1><p>Create your patient account to manage admissions and appointments in one secure place.</p><ul><li>Choose from available doctors</li><li>Review consultation fees before booking</li><li>Download your patient token as a PDF</li></ul></div><div className="story-note">Your health. Your time. Your care.</div></aside>
    <section className="auth-panel"><div className="auth-form-wrap"><Logo/><h2>Create your account</h2><p className="muted">Start your patient journey with MediCare.</p><div className="google-area"><GoogleButton onError={setError}/></div><div className="or-divider"><span>or sign up with email</span></div>
      <form onSubmit={submit} className="form-stack">
        <label>Full name<div className="input-wrap"><UserRound size={17}/><input name="name" value={form.name} onChange={change} placeholder="Enter your full name" required maxLength="100"/></div></label>
        <label>Email address<div className="input-wrap"><Mail size={17}/><input name="email" type="email" value={form.email} onChange={change} placeholder="you@example.com" required/></div></label>
        <label>Mobile number<div className="input-wrap"><Phone size={17}/><input name="phone" value={form.phone} onChange={change} placeholder="Your contact number" maxLength="20"/></div></label>
        <label>Password<div className="input-wrap"><LockKeyhole size={17}/><input name="password" type="password" value={form.password} onChange={change} placeholder="At least 8 characters" required minLength="8"/></div></label>
        <p className="tiny muted">By creating an account, you agree to the hospital's terms and privacy notice.</p>
        {error && <div className="alert error">{error}</div>}
        <button className="btn primary full" disabled={busy}>{busy ? "Creating account..." : "Create patient account"}</button>
      </form><p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
    </div></section></main>;
}
