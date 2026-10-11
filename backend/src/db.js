require("dotenv").config();
const { Pool } = require("pg");
// Separate DB_* variables avoid URL-encoding problems with special characters in passwords.
// Hosted databases (Neon, Render, Supabase) give one DATABASE_URL; locally we use the DB_* variables.
module.exports = new Pool(process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "expense_voucher",
    });
