import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../App.jsx";

const demo = [["Employee", "employee1@abc.com", "Employee@123"], ["Director", "director@abc.com", "Director@123"], ["Accounts", "accounts@abc.com", "Accounts@123"]];

export default function Login() {
  const { login } = useAuth();
  const [f, setF] = useState({ email: "", password: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setError("");
    if (!f.email || !f.password) return setError("Enter your email and password");
    setBusy(true);
    try { const d = await api("/auth/login", { method: "POST", body: f }); login(d.token, d.user); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="login-page">
      <section className="login-art">
        <div className="logo">Finora<span>Securities Pvt. Ltd.</span></div>
        <h1>From receipt to reimbursement, signed and tracked.</h1>
        <p>Raise a voucher, sign it, and watch it move from Draft to Approved. Accounts sees it the moment the Director signs.</p>
        <div className="mini-slip" aria-hidden="true">
          <div className="mini-row"><span>EV-2026-00128</span><b>₹ 4,850.00</b></div>
          <div className="mini-row"><span>Client visit, Mumbai</span><span>Travel</span></div>
          <div className="mini-sign"><i>R. Sharma</i><i>Director</i></div>
          <div className="stamp approved">Approved</div>
        </div>
      </section>
      <form className="login-card" onSubmit={submit} noValidate>
        <h2>Welcome back</h2>
        <p className="muted">Sign in to manage your vouchers.</p>
        {error && <div className="alert error">{error}</div>}
        <label>Email<input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} autoComplete="username" /></label>
        <label>Password<input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} autoComplete="current-password" /></label>
        <button className="btn primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <div className="demo"><small>Try a demo role</small>
          {demo.map(([r, e, p]) => <button type="button" key={r} className="chip" onClick={() => setF({ email: e, password: p })}>{r}</button>)}
        </div>
      <p className="switch">New employee? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
