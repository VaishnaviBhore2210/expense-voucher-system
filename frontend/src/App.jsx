import { createContext, useContext, useState, useEffect } from "react";
import { Routes, Route, Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import VoucherList from "./pages/VoucherList.jsx";
import VoucherForm from "./pages/VoucherForm.jsx";
import VoucherDetail from "./pages/VoucherDetail.jsx";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function Protected({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

const ICON = { Dashboard: "▦", "My vouchers": "▤", "New voucher": "＋", "Pending approvals": "◔", "All vouchers": "▤" };

function Shell() {
  const { user, logout, dark, setDark } = useAuth();
  const [open, setOpen] = useState(false);
  const links = {
    Employee: [["/", "Dashboard"], ["/vouchers", "My vouchers"], ["/vouchers/new", "New voucher"]],
    Director: [["/", "Dashboard"], ["/pending", "Pending approvals"], ["/vouchers", "All vouchers"]],
    Accounts: [["/", "Dashboard"], ["/vouchers", "All vouchers"]],
  }[user.role];
  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn" aria-label="Menu" onClick={() => setOpen(!open)}>☰</button>
        <strong>Finora</strong>
      </header>
      <aside className={"sidebar" + (open ? " open" : "")} onClick={() => setOpen(false)}>
        <div className="brand">Finora<span>Securities Pvt. Ltd.</span></div>
        <nav>{links.map(([to, label]) => <NavLink key={to} to={to} end><i>{ICON[label]}</i>{label}</NavLink>)}</nav>
        <div className="me">
          <b>{user.name}</b><span>{user.role}</span>
          <button className="btn ghost light" onClick={() => setDark(!dark)}>{dark ? "Light mode" : "Dark mode"}</button>
          <button className="btn ghost light" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <div className="main">
        <header className="top">
          <span className="muted">{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
          <div className="top-right">
            <button className="icon-round" title="Toggle theme" aria-label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? "☀" : "☾"}</button>
            <span className="chip-role">{user.role}</span>
            <span className="avatar" title={user.name}>{user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span>
          </div>
        </header>
        <main className="content"><Outlet /></main>
        <footer className="foot">
          <span>© {new Date().getFullYear()} Finora Securities Pvt. Ltd. · Expense Voucher Management System v1.0</span>
          <span className="foot-links"><a href="mailto:support@finora.example">Help &amp; support</a><a href="#top" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top ↑</a><span className="ok-dot">● All systems normal</span></span>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const nav = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("theme", dark ? "dark" : "light"); }, [dark]);
  const login = (token, u) => { localStorage.setItem("token", token); localStorage.setItem("user", JSON.stringify(u)); setUser(u); nav("/"); };
  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); nav("/login"); };
  return (
    <AuthCtx.Provider value={{ user, login, logout, dark, setDark }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route element={<Protected />}>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="vouchers" element={<VoucherList mode="all" />} />
            <Route path="vouchers/:id" element={<VoucherDetail />} />
            <Route element={<Protected roles={["Employee"]} />}>
              <Route path="vouchers/new" element={<VoucherForm />} />
              <Route path="vouchers/:id/edit" element={<VoucherForm />} />
            </Route>
            <Route element={<Protected roles={["Director"]} />}>
              <Route path="pending" element={<VoucherList mode="pending" />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthCtx.Provider>
  );
}
