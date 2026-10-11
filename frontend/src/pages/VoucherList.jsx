import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, date, CATEGORIES } from "../api.js";
import { useAuth } from "../App.jsx";
import { Skeleton, Pager } from "../ui.jsx";

export const Badge = ({ s }) => <span className={"badge " + s.toLowerCase().replace(" ", "-")}>{s}</span>;
const empty = { q: "", status: "", department: "", category: "", from: "", to: "", min: "", max: "", sort: "created_at", order: "desc" };
const PER = 10;

export default function VoucherList({ mode }) {
  const { user } = useAuth();
  const [f, setF] = useState(empty); const [rows, setRows] = useState(null); const [error, setError] = useState(""); const [page, setPage] = useState(1);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  useEffect(() => { setPage(1); }, [f, mode]);
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(); Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
      if (mode === "pending") p.set("status", "Pending Approval");
      api("/vouchers?" + p).then(setRows).catch(e => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [f, mode]);
  const sortBy = k => setF({ ...f, sort: k, order: f.sort === k && f.order === "desc" ? "asc" : "desc" });
  const Th = ({ k, children }) => <th className="sortable" onClick={() => sortBy(k)}>{children}{f.sort === k ? (f.order === "asc" ? " ▲" : " ▼") : ""}</th>;
  const title = mode === "pending" ? "Pending approvals" : user.role === "Employee" ? "My vouchers" : "All vouchers";
  const showEmp = user.role !== "Employee";
  const tabs = user.role === "Employee" ? ["", "Draft", "Pending Approval", "Approved", "Rejected"] : ["", "Pending Approval", "Approved", "Rejected"];
  const pages = rows ? Math.ceil(rows.length / PER) : 1;
  const shown = rows ? rows.slice((page - 1) * PER, page * PER) : [];
  return (
    <>
      <div className="page-head"><h1>{title}</h1>{user.role === "Employee" && <Link className="btn primary" to="/vouchers/new">New voucher</Link>}</div>
      {mode !== "pending" && <div className="tabs">{tabs.map(t => <button key={t} className={f.status === t ? "on" : ""} onClick={() => setF({ ...f, status: t })}>{t || "All"}</button>)}</div>}
      <div className="filters panel">
        <input placeholder="Search number, employee or title" value={f.q} onChange={set("q")} />
        <input placeholder="Department" value={f.department} onChange={set("department")} />
        <select value={f.category} onChange={set("category")}><option value="">All categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
        <label>From<input type="date" value={f.from} onChange={set("from")} /></label>
        <label>To<input type="date" value={f.to} onChange={set("to")} /></label>
        <input type="number" placeholder="Min amount" value={f.min} onChange={set("min")} />
        <input type="number" placeholder="Max amount" value={f.max} onChange={set("max")} />
        <button className="btn ghost" onClick={() => setF(empty)}>Clear</button>
      </div>
      {error && <div className="alert error">{error}</div>}
      {!rows ? <Skeleton rows={5} /> : rows.length === 0 ? <div className="panel empty">No vouchers match. {user.role === "Employee" && <Link to="/vouchers/new">Create your first voucher</Link>}</div> :
        <>
          <p className="muted summary">{rows.length} voucher{rows.length > 1 && "s"} · {money(rows.reduce((a, v) => a + Number(v.amount), 0))} total · click a column title to sort</p>
          <div className="panel table-wrap"><table className="table">
            <thead><tr><Th k="voucher_no">Voucher</Th>{showEmp && <th>Employee</th>}<th>Title</th><th>Department</th><Th k="expense_date">Expense date</Th><Th k="amount">Amount</Th><Th k="status">Status</Th></tr></thead>
            <tbody>{shown.map(v => (
              <tr key={v.id}>
                <td data-label="Voucher"><Link to={`/vouchers/${v.id}`}>{v.voucher_no}</Link></td>
                {showEmp && <td data-label="Employee">{v.employee_name}</td>}
                <td data-label="Title">{v.title}</td><td data-label="Department">{v.department}</td>
                <td data-label="Expense date">{date(v.expense_date)}</td><td data-label="Amount"><b>{money(v.amount)}</b></td>
                <td data-label="Status"><Badge s={v.status} /></td>
              </tr>))}</tbody>
          </table></div>
          <Pager page={page} pages={pages} onChange={setPage} />
        </>}
    </>
  );
}
