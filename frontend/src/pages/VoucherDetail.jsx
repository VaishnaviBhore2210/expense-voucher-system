import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, money, date } from "../api.js";
import { useAuth } from "../App.jsx";
import { useToast, Modal } from "../ui.jsx";
import { Badge } from "./VoucherList.jsx";

function Tracker({ status }) {
  const rej = status === "Rejected";
  const at = { Draft: 0, "Pending Approval": 1, Approved: 2, Rejected: 2 }[status];
  const steps = ["Draft", "Pending approval", rej ? "Rejected" : "Approved"];
  return (
    <ol className="tracker no-print">{steps.map((l, i) => (
      <li key={l} className={(i < at ? "done " : i === at ? "now " : "") + (rej && i === 2 ? "rej" : "")}><span>{i < at ? "✓" : i + 1}</span>{l}</li>))}
    </ol>);
}

export default function VoucherDetail() {
  const { id } = useParams(); const { user } = useAuth(); const nav = useNavigate(); const toast = useToast(); const [confirmDel, setConfirmDel] = useState(false);
  const [v, setV] = useState(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [sig, setSig] = useState(null); const [reason, setReason] = useState(""); const [rejecting, setRejecting] = useState(false);
  const load = () => api("/vouchers/" + id).then(setV).catch(e => setError(e.message));
  useEffect(() => { load(); }, [id]);
  const run = async (fn, ok) => { setError(""); setBusy(true); try { await fn(); if (ok) toast(ok); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  if (error && !v) return <div className="alert error">{error}</div>;
  if (!v) return <p className="muted">Loading…</p>;
  const isOwnerDraft = user.role === "Employee" && v.status === "Draft";
  const canDecide = user.role === "Director" && v.status === "Pending Approval";
  const approve = () => run(async () => {
    const form = new FormData(); if (sig) form.append("signature", sig);
    await api(`/vouchers/${id}/approve`, { method: "POST", form });
  }, "Voucher approved");
  const reject = () => run(async () => {
    if (!reason.trim()) throw new Error("Enter a rejection reason");
    await api(`/vouchers/${id}/reject`, { method: "POST", body: { reason } }); setRejecting(false);
  }, "Voucher rejected");
  const Row = ({ l, children }) => <div className="row"><span>{l}</span><b>{children || "-"}</b></div>;
  return (
    <>
      <div className="page-head no-print">
        <h1>{v.voucher_no} <Badge s={v.status} /></h1>
        <div className="actions">
          <button className="btn ghost" onClick={() => nav(-1)}>Back</button>
          {user.role === "Accounts" && v.status === "Approved" && <button className="btn" onClick={() => window.print()}>Print voucher</button>}
          {isOwnerDraft && <>
            <Link className="btn" to={`/vouchers/${id}/edit`}>Edit</Link>
            <button className="btn danger" disabled={busy} onClick={() => setConfirmDel(true)}>Delete</button>
            <button className="btn primary" disabled={busy} onClick={() => run(() => api(`/vouchers/${id}/submit`, { method: "POST" }), "Submitted for approval")}>Submit</button>
          </>}
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      <Tracker status={v.status} />
      {v.status === "Rejected" && <div className="alert error"><b>Rejected.</b> {v.rejection_reason}</div>}
      <div className="grid-2">
        <section className="panel stamped"><h2>Expense</h2>
          {(v.status === "Approved" || v.status === "Rejected") && <div className={"stamp " + v.status.toLowerCase()}>{v.status}</div>}
          <Row l="Title">{v.title}</Row><Row l="Department">{v.department}</Row><Row l="Category">{v.category}</Row>
          <Row l="Expense date">{date(v.expense_date)}</Row><Row l="Voucher date">{date(v.voucher_date)}</Row>
          <Row l="Amount">{money(v.amount)}</Row><Row l="Description">{v.description}</Row>
        </section>
        <section className="panel"><h2>Employee and approval</h2>
          <Row l="Employee">{v.employee_name}</Row><Row l="Employee ID">{v.employee_code}</Row>
          <Row l="Status">{v.status}</Row><Row l="Approval date">{v.approved_date && date(v.approved_date)}</Row>
          <Row l="Created">{date(v.created_at)}</Row><Row l="Last updated">{date(v.updated_at)}</Row>
          <div className="sigs">
            <figure><figcaption>Employee signature</figcaption>{v.employee_signature ? <img alt="Employee signature" src={v.employee_signature} /> : <span className="muted">Not added</span>}</figure>
            <figure><figcaption>Director signature</figcaption>{v.director_signature ? <img alt="Director signature" src={v.director_signature} /> : <span className="muted">Pending</span>}</figure>
          </div>
        </section>
      </div>
      {canDecide && (
        <section className="panel no-print"><h2>Decision</h2>
          <label>Your signature (required to approve; your saved one is used if you skip this)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setSig(e.target.files[0] || null)} /></label>
          {rejecting && <label>Rejection reason *<textarea rows="3" value={reason} onChange={e => setReason(e.target.value)} /></label>}
          <div className="actions">
            {!rejecting ? <button className="btn danger" onClick={() => setRejecting(true)}>Reject</button> :
              <><button className="btn ghost" onClick={() => setRejecting(false)}>Cancel</button><button className="btn danger" disabled={busy} onClick={reject}>Confirm rejection</button></>}
            <button className="btn primary" disabled={busy} onClick={approve}>Approve</button>
          </div>
        </section>)}
      {confirmDel && <Modal title="Delete this draft?" onClose={() => setConfirmDel(false)} actions={<>
        <button className="btn ghost" onClick={() => setConfirmDel(false)}>Keep it</button>
        <button className="btn danger" onClick={() => run(async () => { await api("/vouchers/" + id, { method: "DELETE" }); toast("Draft deleted"); nav("/vouchers"); })}>Delete draft</button></>}>
        <p className="muted">This permanently removes {v.voucher_no}. You can't undo it.</p></Modal>}
    </>
  );
}
