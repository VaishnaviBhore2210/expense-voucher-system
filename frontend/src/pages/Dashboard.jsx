import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, date } from "../api.js";
import { useAuth } from "../App.jsx";
import { Badge } from "./VoucherList.jsx";
import { Skeleton } from "../ui.jsx";

const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const initials = n => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null); const [error, setError] = useState("");
  useEffect(() => { api("/dashboard").then(setD).catch(e => setError(e.message)); }, []);
  if (error) return <div className="alert error">{error}</div>;
  if (!d) return <Skeleton rows={6} />;
  const s = d.stats, role = user.role;
  const cards = {
    Employee: [["Total vouchers", s.total, "teal", "▤"], ["Drafts", s.draft, "slate", "✎"], ["Pending approval", s.pending, "warn", "◔"], ["Approved", s.approved, "ok", "✓"], ["Rejected", s.rejected, "bad", "✕"], ["Total claimed", money(s.total_amount), "gold", "₹"]],
    Director: [["Pending approval", s.pending, "warn", "◔"], ["Approved today", s.approved_today, "ok", "✓"], ["Rejected today", s.rejected_today, "bad", "✕"], ["Pending amount", money(s.pending_amount), "teal", "₹"]],
    Accounts: [["Total vouchers", s.total, "teal", "▤"], ["Pending approval", s.pending, "warn", "◔"], ["Approved", s.approved, "ok", "✓"], ["Rejected", s.rejected, "bad", "✕"], ["Approved amount", money(s.approved_amount), "gold", "₹"]],
  }[role];
  const sub = { Employee: "Track your expense claims and raise new vouchers.", Director: s.pending ? `${s.pending} voucher${s.pending > 1 ? "s are" : " is"} waiting for your decision.` : "You're all caught up. No vouchers waiting.", Accounts: "Monitor approved vouchers that are ready for reimbursement." }[role];
  const mix = [["Draft", "draft", s.draft], ["Pending", "pending-approval", s.pending], ["Approved", "approved", s.approved], ["Rejected", "rejected", s.rejected]].filter(m => role === "Employee" || m[1] !== "draft");
  return (
    <>
      <section className="hero">
        <div><small>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</small>
          <h1>{greet()}, {user.name.split(" ")[0]}</h1><p>{sub}</p></div>
        <div className="actions">
          {role === "Employee" && <><Link className="btn gold" to="/vouchers/new">+ New voucher</Link><Link className="btn glass" to="/vouchers">My vouchers</Link></>}
          {role === "Director" && <><Link className="btn gold" to="/pending">Review pending</Link><Link className="btn glass" to="/vouchers">All vouchers</Link></>}
          {role === "Accounts" && <Link className="btn gold" to="/vouchers">Open all vouchers</Link>}
        </div>
      </section>
      <div className={"stats3d" + (role === "Director" ? " wide" : "")}>
        {cards.map(([l, v, tone, ic]) => <div key={l} className={"stat3d tone-" + tone}><i aria-hidden="true">{ic}</i><span>{l}</span><b>{v}</b></div>)}
      </div>
      <div className="dash-grid">
        <section className="panel"><div className="panel-head"><h2>{role === "Accounts" ? "Recently approved" : "Recent activity"}</h2><Link to="/vouchers">View all</Link></div>
          {d.recent.length === 0 ? <p className="muted">Nothing here yet.</p> :
            <ul className="activity">{d.recent.map(v => (
              <li key={v.id}><span className="avatar">{initials(v.employee_name)}</span>
                <div className="grow"><Link to={`/vouchers/${v.id}`}><b>{v.voucher_no}</b> · {v.title}</Link>
                  <span className="muted">{role !== "Employee" && v.employee_name + " · "}{date(v.updated_at)}</span></div>
                <b className="amt">{money(v.amount)}</b><Badge s={v.status} /></li>))}
            </ul>}
        </section>
        <section className="panel"><h2>Status breakdown</h2>
          {s.total === 0 ? <p className="muted">No vouchers yet.</p> : mix.map(([l, c, n]) => (
            <div className="mixrow" key={c}><span>{l}</span><div className="bar"><i className={"fill " + c} style={{ width: (n / s.total * 100) + "%" }} /></div><b>{n}</b></div>))}
          <p className="muted tip">{role === "Employee" ? "Tip: save as draft while you collect receipts, then submit when you're ready." : role === "Director" ? "Tip: your saved signature is reused, so approving takes one click." : "Tip: use filters on All vouchers to prepare reimbursement batches."}</p>
        </section>
      </div>
    </>
  );
}
