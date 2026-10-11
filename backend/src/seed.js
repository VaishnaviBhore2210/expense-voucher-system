const bcrypt = require("bcryptjs"); const pool = require("./db");
const users = [
  ["Daksh Director", "director@abc.com", "Director@123", "Director", "DIR001"],
  ["Anita Accounts", "accounts@abc.com", "Accounts@123", "Accounts", "ACC001"],
  ["Rahul Sharma", "employee1@abc.com", "Employee@123", "Employee", "EMP001"],
  ["Priya Patil", "employee2@abc.com", "Employee@123", "Employee", "EMP002"],
];
(async () => {
  for (const [name, email, pw, role, code] of users) {
    await pool.query(
      `INSERT INTO users(name,email,password_hash,role,employee_code) VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO NOTHING`, [name, email, await bcrypt.hash(pw, 10), role, code]);
  }
  console.log("Seeded demo users"); await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
