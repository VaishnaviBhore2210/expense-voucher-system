export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {}; const token = localStorage.getItem("token");
  if (token) headers.Authorization = "Bearer " + token;
  let payload;
  if (form) payload = form;
  else if (body) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch("/api" + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/auth/login") { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/login"; }
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}
export const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);
export const date = d => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");
export const DEPARTMENTS = ["Engineering", "Finance", "HR", "Operations", "Sales", "Marketing", "Legal", "Admin"];
export const CATEGORIES = ["Travel", "Food", "Accommodation", "Office Supplies", "Client Meeting", "Software", "Training", "Other"];
export const STATUSES = ["Draft", "Pending Approval", "Approved", "Rejected"];
