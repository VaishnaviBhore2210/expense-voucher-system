-- Expense Voucher Management System - PostgreSQL schema
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           VARCHAR(20) NOT NULL CHECK (role IN ('Employee','Director','Accounts')),
  employee_code  VARCHAR(30),
  signature_path TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS voucher_seq START 1;

CREATE TABLE IF NOT EXISTS vouchers (
  id                  SERIAL PRIMARY KEY,
  voucher_no          VARCHAR(30) NOT NULL UNIQUE,
  user_id             INTEGER NOT NULL REFERENCES users(id),
  voucher_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_date        DATE NOT NULL,
  department          VARCHAR(80) NOT NULL,
  title               VARCHAR(150) NOT NULL,
  category            VARCHAR(60),
  description         TEXT,
  amount              NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status              VARCHAR(20) NOT NULL DEFAULT 'Draft'
                      CHECK (status IN ('Draft','Pending Approval','Approved','Rejected')),
  employee_signature  TEXT,
  director_signature  TEXT,
  approved_by         INTEGER REFERENCES users(id),
  approved_date       TIMESTAMPTZ,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vouchers_user ON vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_expense_date ON vouchers(expense_date);
