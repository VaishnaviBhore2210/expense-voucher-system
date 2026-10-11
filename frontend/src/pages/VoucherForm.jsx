import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, money, date, DEPARTMENTS, CATEGORIES } from "../api.js";
import { useAuth } from "../App.jsx";
import { useToast } from "../ui.jsx";

export default function VoucherForm() {
  const { id } = useParams(); const nav = useNavigate(); const { user } = useAuth(); const toast = useToast();
  const [f, setF] = useState({ department: "", title: "", expense_date: "", category: "", description: "", amount: "" });
  const [file, setFile] = useState(null); const [saved, setSaved] = useState(user.signature_path);
  const [errors, setErrors] = useState({}); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [no, setNo] = useState("");
  const sigSrc = useMemo(() => (file ? URL.createObjectURL(file) : saved), [file, saved]);
  useEffect(() => {
    api("/auth/me").then(u => !id && setSaved(u.signature_path));
    if (id) api("/vouchers/" + id).then(v => {
      if (v.status !== "Draft") return nav("/vouchers/" + id, { replace: true });
      setNo(v.voucher_no);
      setF({ department: v.department, title: v.title, expense_date: v.expense_date.slice(0, 10), category: v.category || "", description: v.description || "", amount: v.amount });
      setSaved(v.employee_signature);
    }).catch(e => setError(e.message));
  }, [id]);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const check = forSubmit => {
    const e = {};
    if (!f.department) e.department = "Select a department";
    if (!f.title.trim()) e.title = "Enter an expense title";
    if (!f.expense_date) e.expense_date = "Pick the expense date";
    if (!f.amount || Number(f.amount) <= 0) e.amount = "Amount must be greater than zero";
    if (forSubmit && !file && !saved) e.signature = "Upload your signature before submitting";
    setErrors(e); return Object.keys(e).length === 0;
  };
  const save = async submit => {
    setError(""); if (!check(submit)) return;
    setBusy(true);
    try {
      const form = new FormData(); Object.entries(f).forEach(([k, v]) => form.append(k, v)); if (file) form.append("signature", file);
      const v = await api(id ? "/vouchers/" + id : "/vouchers", { method: id ? "PUT" : "POST", form });
      if (submit) await api(`/vouchers/${v.id}/submit`, { method: "POST" });
      toast(submit ? "Voucher submitted for approval" : "Draft saved"); nav("/vouchers/" + v.id);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const Err = ({ k }) => errors[k] ? <small className="err">{errors[k]}</small> : null;
  const done = [f.department, f.title.trim(), f.expense_date, Number(f.amount) > 0, file || saved].filter(Boolean).length;
  return (
    <>
      <section className="hero slim"><div><small>{id ? "Editing draft " + no : "Step 1 of 2 · Draft"}</small><h1>{id ? "Edit draft voucher" : "Create expense voucher"}</h1>
        <p>Fill in the details, add your signature, then save a draft or send it to the Director.</p></div>
        <div className="progress" aria-label="Form completion"><b>{done}/5</b><span>required fields</span><div className="bar"><i className="fill approved" style={{ width: done * 20 + "%" }} /></div></div>
      </section>
      <div className="form-page">
        <form className="panel formcard" onSubmit={e => e.preventDefault()} noValidate>
          {error && <div className="alert error">{error}</div>}
          <h3 className="sec">Expense details</h3>
          <div className="form-grid">
            <label>Department *<select value={f.department} onChange={set("department")}><option value="">Select department…</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select><Err k="department" /></label>
            <label>Expense category<select value={f.category} onChange={set("category")}><option value="">Select category…</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
            <label className="full">Expense title *<input placeholder="e.g. Client visit, Mumbai" value={f.title} onChange={set("title")} maxLength={150} /><Err k="title" /></label>
            <label>Expense date *<input type="date" value={f.expense_date} onChange={set("expense_date")} max={new Date().toISOString().slice(0, 10)} /><Err k="expense_date" /></label>
            <label>Amount *<div className="money"><span>₹</span><input type="number" min="0" step="0.01" placeholder="0.00" value={f.amount} onChange={set("amount")} /></div><Err k="amount" /></label>
          </div>
          <h3 className="sec">Description</h3>
          <label><textarea rows="4" placeholder="What was this expense for? Add bill or receipt references." value={f.description} onChange={set("description")} maxLength={500} /><small className="muted right">{f.description.length}/500</small></label>
          <h3 className="sec">Your signature *</h3>
          <label className="drop">
            <input className="sr" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files[0] || null)} />
            {sigSrc ? <img className="sig-preview" alt="Signature preview" src={sigSrc} /> : <span className="drop-ic">✍</span>}
            <b>{file ? file.name : sigSrc ? "Using your saved signature" : "Click to upload your signature"}</b>
            <small className="muted">PNG, JPG or WebP · max 500 KB{sigSrc ? " · click to replace" : ""}</small>
          </label>
          <Err k="signature" />
          <div className="actions formactions">
            <button className="btn ghost" type="button" onClick={() => nav(-1)}>Cancel</button>
            <button className="btn" type="button" disabled={busy} onClick={() => save(false)}>Save as draft</button>
            <button className="btn primary" type="button" disabled={busy} onClick={() => save(true)}>{busy ? "Working…" : "Submit for approval →"}</button>
          </div>
        </form>
        <aside className="preview" aria-label="Live voucher preview">
          <div className="pslip">
            <div className="stamp draft">Draft</div>
            <small className="muted">Voucher preview</small>
            <h3>{f.title || "Expense title"}</h3>
            <div className="pamt">{f.amount ? money(f.amount) : "₹ 0.00"}</div>
            <div className="row"><span>Voucher no.</span><b>{no || "Auto-generated"}</b></div>
            <div className="row"><span>Employee</span><b>{user.name}</b></div>
            <div className="row"><span>Department</span><b>{f.department}</b></div>
            <div className="row"><span>Category</span><b>{f.category}</b></div>
            <div className="row"><span>Expense date</span><b>{f.expense_date ? date(f.expense_date) : ""}</b></div>
            <p className="pdesc">{f.description}</p>
            <div className="sigs"><figure><figcaption>Employee signature</figcaption>{sigSrc ? <img alt="" src={sigSrc} /> : <span className="muted">Not added</span>}</figure>
              <figure><figcaption>Director signature</figcaption><span className="muted">Pending</span></figure></div>
          </div>
        </aside>
      </div>
    </>
  );
}
