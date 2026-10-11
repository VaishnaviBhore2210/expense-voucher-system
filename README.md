# Finora Expense Voucher Management System

A full-stack web application that digitises the expense voucher process: employees raise and sign vouchers, the Director approves or rejects them, and the Accounts team monitors approved vouchers for reimbursement.

Built as the Full Stack Developer Internship assignment (Expense Voucher Management System).

- **Live demo:** `https://expense-voucher-system-blush.vercel.app/login` *(add your link)*
- **Demo video:** `https://drive.google.com/file/d/1mYQwqECMQgYjILrk_H8KDnlzTjvBAkQb/view?usp=sharing`
- **github Clone:  https://github.com/VaishnaviBhore2210/expense-voucher-system.git
- **Repository:** `https://github.com/VaishnaviBhore2210/expense-voucher-system.git`

## Demo accounts
| Role | Email | Password |
|---|---|---|
| Employee | employee1@abc.com | Employee@123 |
| Director | director@abc.com | Director@123 |
| Accounts | accounts@abc.com | Accounts@123 |

New employees can also register from the login page. The hosted backend sleeps when idle, so the first request may take up to a minute.

## Features
**Employee**
- Register and log in; create vouchers and save them as Draft.
- Edit or delete drafts; submit for approval (employee signature required).
- Upload a signature once (reused on later vouchers); live voucher preview while filling the form.
- See only their own vouchers, with status tracker, rejection reason and dashboard totals.

**Director**
- Dashboard: pending count, approved today, rejected today, pending amount, recent activity.
- Pending approvals queue; search, filter and sort all submitted vouchers.
- Approve with a signature, or reject with a mandatory reason. Cannot edit employee data.

**Accounts**
- Read-only view of every submitted voucher, with employee and director signatures and approval status.
- Search, filter, sort; print approved vouchers (or save as PDF from the print dialog).

**General**
- JWT authentication, role-based access control on every API route, protected frontend routes.
- Responsive layout, dark mode, toast notifications, pagination, sortable tables.
- Validation on both the frontend and the backend.

## Tech stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, plain CSS |
| Backend | Node.js, Express, JWT, bcryptjs, multer, helmet, cors |
| Database | PostgreSQL |
| Hosting | Vercel (frontend), Render (API), Neon (database) |

## Project structure
```
expense-voucher-system/
├── backend/
│   ├── schema.sql            # database schema
│   ├── .env.example
│   └── src/
│       ├── server.js         # Express app
│       ├── routes.js         # all REST endpoints
│       ├── middleware.js     # JWT auth, role guard, signature upload
│       ├── db.js             # PostgreSQL pool
│       ├── initDb.js         # runs schema.sql
│       └── seed.js           # demo users
├── frontend/
│   ├── vercel.json           # API proxy + SPA fallback for Vercel
│   └── src/
│       ├── App.jsx           # layout, routing, auth context
│       ├── api.js, ui.jsx    # fetch helper, toasts, modal, pager
│       ├── styles.css
│       └── pages/            # Login, Register, Dashboard, VoucherList, VoucherForm, VoucherDetail
└── docs/screenshots/
```

## Workflow
```
Draft ──submit──▶ Pending Approval ──▶ Approved ──▶ visible to Accounts for reimbursement
                          └──────────▶ Rejected (employee sees the reason)
```
Drafts are editable and deletable. Once submitted, approved or rejected, a voucher is read-only.

## Run locally
Requirements: Node.js 18+, PostgreSQL 13+.

```bash
# 1. Database
createdb expense_voucher          # or create it in pgAdmin

# 2. Backend
cd backend
cp .env.example .env              # on Windows: copy .env.example .env
# edit .env: set DB_PASSWORD and JWT_SECRET
npm install
npm run db:init                   # creates tables
npm run seed                      # creates demo users
npm run dev                       # http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

### Environment variables (`backend/.env`)
| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Local PostgreSQL connection |
| `DATABASE_URL` | Hosted PostgreSQL URL; if set, it replaces the `DB_*` values |
| `JWT_SECRET` | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default 8h) |
| `CLIENT_URL` | Allowed browser origin for CORS |

## Database schema (`backend/schema.sql`)
**users**: `id`, `name`, `email` (unique), `password_hash`, `role` (Employee | Director | Accounts), `employee_code`, `signature_path`, `created_at`.

**vouchers**: `id`, `voucher_no` (unique, auto-generated like `EV-2026-00001` from a sequence), `user_id` (FK), `voucher_date`, `expense_date`, `department`, `title`, `category`, `description`, `amount` (> 0), `status` (Draft | Pending Approval | Approved | Rejected), `employee_signature`, `director_signature`, `approved_by` (FK), `approved_date`, `rejection_reason`, `created_at`, `updated_at`.

Indexes on `user_id`, `status` and `expense_date`. Signatures are stored as image data URLs.

## API reference
Base path `/api`. Protected routes need `Authorization: Bearer <token>`. Errors return `{ "message": "..." }` with status 400, 401, 403, 404, 409 or 500.

| Method | Path | Role | Description |
|---|---|---|---|
| POST | /auth/register | public | Employee self-registration (role is always Employee) |
| POST | /auth/login | public | Returns token and user |
| GET | /auth/me | any | Current user |
| POST | /auth/signature | Employee, Director | Save a signature (multipart field `signature`) |
| GET | /dashboard | any | Role-specific stats and recent vouchers |
| GET | /vouchers | any | List vouchers. Employee: own only. Others: all non-draft. Query: `q, status, department, category, from, to, min, max, sort, order` |
| GET | /vouchers/:id | any (scoped) | Voucher details with signatures |
| POST | /vouchers | Employee | Create draft (multipart, optional `signature`) |
| PUT | /vouchers/:id | Employee | Edit own draft |
| DELETE | /vouchers/:id | Employee | Delete own draft |
| POST | /vouchers/:id/submit | Employee | Draft → Pending Approval (signature required) |
| POST | /vouchers/:id/approve | Director | Approve (signature required) |
| POST | /vouchers/:id/reject | Director | Body `{ "reason": "..." }` (required) |

## Validation and business rules
- Department, expense title, expense date and amount are required; amount must be greater than zero.
- Employee signature is required before submission; Director signature before approval; rejection reason when rejecting.
- Voucher numbers are unique and generated automatically; new vouchers start as Draft.
- Only drafts can be edited or deleted; submitted, approved and rejected vouchers are read-only.
- Only the Director can approve or reject. Employees see only their own vouchers; Director and Accounts see all submitted vouchers.

## Deployment
**1. Database (Neon).** Create a free PostgreSQL project and copy the connection string. Create the tables and demo users from your machine:
```powershell
cd backend
$env:DATABASE_URL="<postgresql://neondb_owner:npg_2qvwBnhuyG9r@ep-billowing-water-b4xdncrf-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require>"
npm run db:init
npm run seed
```
**2. API (Render).** New Web Service from this repo: Root Directory `backend`, Build `npm install`, Start `npm start`. Environment: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` (your Vercel URL).

**3. Frontend (Vercel).** In `frontend/vercel.json`, replace `Yhttps://expense-voucher-system-uy9s.onrender.com/` with your Render URL. Import the repo in Vercel, set Root Directory to `frontend`, and deploy. Vercel proxies `/api` to the Render API, so no CORS setup or frontend environment variables are needed.

## Security notes
- Passwords are hashed with bcrypt; sessions use signed JWTs that expire.
- Every protected route checks the token and the role; vouchers are scoped by owner or role on the server, not only in the UI.
- Public registration always creates an Employee; Director and Accounts users are created by an administrator.
- Signature uploads are limited to PNG, JPG or WebP images under 500 KB.

## Assumptions
- "Submitted" and "Pending Approval" are one step: submitting moves a draft straight to Pending Approval.
- Director and Accounts never see other users' drafts.
- Rejected vouchers are final; the employee creates a new voucher to resubmit.
- A signature uploaded once is saved on the user and reused; a new upload replaces it.
- Printing uses the browser print dialog.

## Possible improvements
Pagination on the server, email notifications, audit history per voucher, PDF export, S3 storage for large attachments, automated tests, Docker setup.

## Screenshots

### Login
![Login page](docs/screenshots/login.png)

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Create voucher
![New voucher form](docs/screenshots/voucher-form.png)

### Director approval
![Director approval](docs/screenshots/director-approval.png)

