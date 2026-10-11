const jwt = require("jsonwebtoken"); const multer = require("multer");

exports.auth = (req, res, next) => {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: "Session expired. Please log in again." }); }
};

exports.allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: "You do not have access to this action" });

exports.wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// Signatures are kept in memory and stored in the database as data URLs,
// so the app works on hosts without a persistent disk (Render, Vercel, etc.).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(png|jpe?g|webp)$/.test(file.mimetype) ? cb(null, true) : cb(new Error("Signature must be a PNG, JPG or WebP image")),
}).single("signature");

exports.withUpload = (req, res, next) => upload(req, res, err => {
  if (!err) return next();
  res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "Signature image must be under 500 KB" : err.message });
});
