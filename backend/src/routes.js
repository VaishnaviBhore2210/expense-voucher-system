const router = require("express").Router();
const bcrypt = require("bcryptjs"); const jwt = require("jsonwebtoken");
const pool = require("./db");
const { auth, allow, wrap, withUpload } = require("./middleware");

const fileUrl = f => (f ? `data:${f.mimetype};base64,${f.buffer.toString("base64")}` : null);
const safeUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, employee_code: u.employee_code, signature_path: u.signature_path });
const PENDING = "Pending Approval";
const bad = (res, message, code = 400) => res.status(code).json({ message });

function validate(b) {
  if (!b.department || !String(b.department).trim()) return "Department is required";
  if (!b.title || !String(b.title).trim()) return "Expense title is required";
  if (!b.expense_date) return "Expense date is required";
  if (b.amount === undefined || b.amount === null || b.amount === "" || isNaN(b.amount)) return "Amount is required";
  if (Number(b.amount) <= 0) return "Amount must be greater than zero";
  return null;
}
const savedSignature = async id => (await pool.query("SELECT signature_path FROM users WHERE id=$1", [id])).rows[0].signature_path;

/* ---------- Auth ---------- */
router.post("/auth/login", wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return bad(res, "Email and password are required");
  const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [email.trim().toLowerCase()]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return bad(res, "Invalid email or password", 401);
  const token = jwt.sign({ id: u.id, role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
  res.json({ token, user: safeUser(u) });
}));

router.post("/auth/register", wrap(async (req, res) => {
  const name = (req.body.name || "").trim(), email = (req.body.email || "").trim().toLowerCase();
  const code = (req.body.employee_code || "").trim() || null, password = req.body.password || "";
  if (name.length < 2) return bad(res, "Full name is required");
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad(res, "Enter a valid email address");
  if (password.length < 8) return bad(res, "Password must be at least 8 characters");
  if ((await pool.query("SELECT 1 FROM users WHERE email=$1", [email])).rowCount) return bad(res, "An account with this email already exists", 409);
  // Public sign-up always creates an Employee; Director and Accounts accounts are assigned by an administrator.
  const { rows } = await pool.query(
    "INSERT INTO users(name,email,password_hash,role,employee_code) VALUES($1,$2,$3,\u0027Employee\u0027,$4) RETURNING *",
    [name, email, await bcrypt.hash(password, 10), code]);
  const u = rows[0];
  const token = jwt.sign({ id: u.id, role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
  res.status(201).json({ token, user: safeUser(u) });
}));

router.get("/auth/me", auth, wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
  if (!rows[0]) return bad(res, "User not found", 401);
  res.json(safeUser(rows[0]));
}));

router.post("/auth/signature", auth, allow("Employee", "Director"), withUpload, wrap(async (req, res) => {
  if (!req.file) return bad(res, "Please choose a signature image");
  const { rows } = await pool.query("UPDATE users SET signature_path=$1 WHERE id=$2 RETURNING *", [fileUrl(req.file), req.user.id]);
  res.json(safeUser(rows[0]));
}));

/* ---------- Vouchers ---------- */
const SELECT = `SELECT v.*, u.name AS employee_name, u.employee_code FROM vouchers v JOIN users u ON u.id = v.user_id`;
// List queries skip the (large) signature columns; the detail endpoint returns them.
const LIST_SELECT = `SELECT v.id, v.voucher_no, v.user_id, v.voucher_date, v.expense_date, v.department, v.title, v.category, v.description,
  v.amount, v.status, v.approved_date, v.rejection_reason, v.created_at, v.updated_at, u.name AS employee_name, u.employee_code
  FROM vouchers v JOIN users u ON u.id = v.user_id`;
const SORTS = ["created_at", "updated_at", "amount", "expense_date", "voucher_no", "status"];

router.get("/vouchers", auth, wrap(async (req, res) => {
  const q = req.query, where = [], p = [];
  const add = (sql, val) => { p.push(val); where.push(sql.replace(/\$#/g, "$" + p.length)); };
  if (req.user.role === "Employee") add("v.user_id = $#", req.user.id);
  else where.push("v.status <> \u0027Draft\u0027");
  if (q.q) add("(v.voucher_no ILIKE $# OR u.name ILIKE $# OR v.title ILIKE $#)", `%${q.q}%`);
  if (q.status) add("v.status = $#", q.status);
  if (q.department) add("v.department ILIKE $#", `%${q.department}%`);
  if (q.category) add("v.category = $#", q.category);
  if (q.from) add("v.expense_date >= $#", q.from);
  if (q.to) add("v.expense_date <= $#", q.to);
  if (q.min) add("v.amount >= $#", q.min);
  if (q.max) add("v.amount <= $#", q.max);
  const sort = SORTS.includes(q.sort) ? q.sort : "created_at";
  const order = q.order === "asc" ? "ASC" : "DESC";
  const { rows } = await pool.query(`${LIST_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY v.${sort} ${order}, v.id DESC`, p);
  res.json(rows);
}));

async function loadVoucher(req, res) {
  const { rows } = await pool.query(`${SELECT} WHERE v.id = $1`, [req.params.id]);
  const v = rows[0];
  const visible = v && (req.user.role === "Employee" ? v.user_id === req.user.id : v.status !== "Draft");
  if (!visible) { bad(res, "Voucher not found", 404); return null; }
  return v;
}

router.get("/vouchers/:id", auth, wrap(async (req, res) => { const v = await loadVoucher(req, res); if (v) res.json(v); }));

router.post("/vouchers", auth, allow("Employee"), withUpload, wrap(async (req, res) => {
  const b = req.body, err = validate(b); if (err) return bad(res, err);
  let sig = fileUrl(req.file);
  if (sig) await pool.query("UPDATE users SET signature_path=$1 WHERE id=$2", [sig, req.user.id]);
  else sig = await savedSignature(req.user.id);
  const { rows } = await pool.query(
    `INSERT INTO vouchers(voucher_no,user_id,expense_date,department,title,category,description,amount,employee_signature)
     VALUES ("EV-"||to_char(now(),"YYYY")||"-"||lpad(nextval("voucher_seq")::text,5,"0"),$1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`.replace(/"/g, "\u0027"),
    [req.user.id, b.expense_date, b.department.trim(), b.title.trim(), b.category || null, b.description || null, b.amount, sig]);
  res.status(201).json(rows[0]);
}));

router.put("/vouchers/:id", auth, allow("Employee"), withUpload, wrap(async (req, res) => {
  const v = await loadVoucher(req, res); if (!v) return;
  if (v.status !== "Draft") return bad(res, "Only draft vouchers can be edited", 409);
  const b = req.body, err = validate(b); if (err) return bad(res, err);
  const sig = fileUrl(req.file) || v.employee_signature;
  if (req.file) await pool.query("UPDATE users SET signature_path=$1 WHERE id=$2", [sig, req.user.id]);
  const { rows } = await pool.query(
    `UPDATE vouchers SET expense_date=$1,department=$2,title=$3,category=$4,description=$5,amount=$6,employee_signature=$7,updated_at=now()
     WHERE id=$8 RETURNING *`,
    [b.expense_date, b.department.trim(), b.title.trim(), b.category || null, b.description || null, b.amount, sig, v.id]);
  res.json(rows[0]);
}));

router.delete("/vouchers/:id", auth, allow("Employee"), wrap(async (req, res) => {
  const v = await loadVoucher(req, res); if (!v) return;
  if (v.status !== "Draft") return bad(res, "Only draft vouchers can be deleted", 409);
  await pool.query("DELETE FROM vouchers WHERE id=$1", [v.id]);
  res.json({ message: "Voucher deleted" });
}));

router.post("/vouchers/:id/submit", auth, allow("Employee"), wrap(async (req, res) => {
  const v = await loadVoucher(req, res); if (!v) return;
  if (v.status !== "Draft") return bad(res, "Voucher is already submitted", 409);
  if (!v.employee_signature) return bad(res, "Employee signature is required before submission");
  const { rows } = await pool.query("UPDATE vouchers SET status=$1, updated_at=now() WHERE id=$2 RETURNING *", [PENDING, v.id]);
  res.json(rows[0]);
}));

router.post("/vouchers/:id/approve", auth, allow("Director"), withUpload, wrap(async (req, res) => {
  const v = await loadVoucher(req, res); if (!v) return;
  if (v.status !== PENDING) return bad(res, "Only vouchers pending approval can be approved", 409);
  let sig = fileUrl(req.file);
  if (sig) await pool.query("UPDATE users SET signature_path=$1 WHERE id=$2", [sig, req.user.id]);
  else sig = await savedSignature(req.user.id);
  if (!sig) return bad(res, "Director signature is required for approval");
  const { rows } = await pool.query(
    "UPDATE vouchers SET status=\u0027Approved\u0027, director_signature=$1, approved_by=$2, approved_date=now(), rejection_reason=NULL, updated_at=now() WHERE id=$3 RETURNING *",
    [sig, req.user.id, v.id]);
  res.json(rows[0]);
}));

router.post("/vouchers/:id/reject", auth, allow("Director"), wrap(async (req, res) => {
  const v = await loadVoucher(req, res); if (!v) return;
  if (v.status !== PENDING) return bad(res, "Only vouchers pending approval can be rejected", 409);
  const reason = (req.body.reason || "").trim();
  if (!reason) return bad(res, "Rejection reason is required");
  const { rows } = await pool.query(
    "UPDATE vouchers SET status=\u0027Rejected\u0027, rejection_reason=$1, approved_by=$2, updated_at=now() WHERE id=$3 RETURNING *",
    [reason, req.user.id, v.id]);
  res.json(rows[0]);
}));

/* ---------- Dashboard ---------- */
router.get("/dashboard", auth, wrap(async (req, res) => {
  const emp = req.user.role === "Employee";
  const scope = emp ? "user_id = $1" : "status <> \u0027Draft\u0027";
  const p = emp ? [req.user.id] : [];
  const stats = (await pool.query(
    `SELECT count(*)::int AS total,
       count(*) FILTER (WHERE status=\u0027Draft\u0027)::int AS draft,
       count(*) FILTER (WHERE status=\u0027${PENDING}\u0027)::int AS pending,
       count(*) FILTER (WHERE status=\u0027Approved\u0027)::int AS approved,
       count(*) FILTER (WHERE status=\u0027Rejected\u0027)::int AS rejected,
       count(*) FILTER (WHERE status=\u0027Approved\u0027 AND approved_date::date = current_date)::int AS approved_today,
       count(*) FILTER (WHERE status=\u0027Rejected\u0027 AND updated_at::date = current_date)::int AS rejected_today,
       COALESCE(sum(amount),0)::float AS total_amount,
       COALESCE(sum(amount) FILTER (WHERE status=\u0027${PENDING}\u0027),0)::float AS pending_amount,
       COALESCE(sum(amount) FILTER (WHERE status=\u0027Approved\u0027),0)::float AS approved_amount
     FROM vouchers WHERE ${scope}`, p)).rows[0];
  const where = emp ? "v.user_id = $1" : req.user.role === "Accounts" ? "v.status = \u0027Approved\u0027" : "v.status <> \u0027Draft\u0027";
  const recent = (await pool.query(`${LIST_SELECT} WHERE ${where} ORDER BY v.updated_at DESC LIMIT 6`, p)).rows;
  res.json({ stats, recent });
}));

module.exports = router;
