import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../App.jsx";

export default function Register() {
  const { login } = useAuth();
  const [f, setF] = useState({ name: "", email: "", employee_code: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({}); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setError("");
    const v = {};
    if (f.name.trim().length < 2) v.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) v.email = "Enter a valid email address";
    if (f.password.length < 8) v.password = "Use at least 8 characters";
    if (f.confirm !== f.password) v.confirm = "Passwords do not match";
    setErrors(v); if (Object.keys(v).length) return;
    setBusy(true);
    try { const d = await api("/auth/register", { method: "POST", body: { name: f.name, email: f.email, employee_code: f.employee_code, password: f.password } }); login(d.token, d.user); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const Err = ({ k }) => errors[k] ? <small className="err">{errors[k]}</small> : null;
  return (
    <div className="login-page">
      <section className="login-art">
        <div className="logo">Finora<span>Securities Pvt. Ltd.</span></div>
        <h1>Join the team portal and raise vouchers in minutes.</h1>
        <p>New accounts are created as Employee. Director and Accounts access is assigned by the company administrator.</p>
      </section>
      <form className="login-card" onSubmit={submit} noValidate>
        <h2>Create your account</h2>
        <p className="muted">Employee registration</p>
        {error && <div className="alert error">{error}</div>}
        <label>Full name *<input value={f.name} onChange={set("name")} autoComplete="name" /><Err k="name" /></label>
        <label>Work email *<input type="email" value={f.email} onChange={set("email")} autoComplete="email" /><Err k="email" /></label>
        <label>Employee ID (optional)<input value={f.employee_code} onChange={set("employee_code")} maxLength={30} /></label>
        <label>Password *<input type="password" value={f.password} onChange={set("password")} autoComplete="new-password" /><Err k="password" /></label>
        <label>Confirm password *<input type="password" value={f.confirm} onChange={set("confirm")} autoComplete="new-password" /><Err k="confirm" /></label>
        <button className="btn primary" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <p className="switch">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
