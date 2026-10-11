const fs = require("fs"); const path = require("path"); const pool = require("./db");
(async () => {
  await pool.query(fs.readFileSync(path.join(__dirname, "../schema.sql"), "utf8"));
  console.log("Schema created"); await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
