// ============================================================
// server.js — Express backend for the feedback system
// ============================================================
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DATA_FILE = path.join(__dirname, "feedback.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readFeedback() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeFeedback(entry) {
  const all = readFeedback();
  all.push(entry);
  fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2));
}

// Grade regex: ^(1[0-2]|[1-9])[a-d]$
const GRADE_REGEX = /^(1[0-2]|[1-9])[a-d]$/;

// ── POST /api/feedback ──────────────────────────────────────
app.post("/api/feedback", (req, res) => {
  const { type, body, name, grade } = req.body;

  const validTypes = ["Complaint", "Suggestion", "Inquiry", "Reporting"];
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid message type." });
  }
  if (!body || body.trim().length === 0) {
    return res.status(400).json({ error: "Message body is required." });
  }
  if (grade && !GRADE_REGEX.test(grade)) {
    return res.status(400).json({ error: "Invalid grade format." });
  }

  const entry = {
    id: Date.now(),
    type,
    body: body.trim(),
    name: name ? name.trim() : null,
    grade: grade || null,
    submittedAt: new Date().toISOString(),
  };

  writeFeedback(entry);
  return res.status(201).json({ message: "Feedback received." });
});

// ── POST /api/admin/login ───────────────────────────────────
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ token: ADMIN_PASSWORD });
  }
  return res.status(401).json({ error: "Incorrect password." });
});

// ── GET /api/admin/feedback ─────────────────────────────────
app.get("/api/admin/feedback", (req, res) => {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();

  if (token !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Forbidden." });
  }

  const all = readFeedback();
  return res.json(all.reverse());
});

// ── DELETE /api/admin/feedback/:id (new) ───────────────────
app.delete("/api/admin/feedback/:id", (req, res) => {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();

  if (token !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Forbidden." });
  }

  const id = Number(req.params.id);
  const all = readFeedback();
  const filtered = all.filter((entry) => entry.id !== id);

  if (filtered.length === all.length) {
    return res.status(404).json({ error: "Entry not found." });
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2));
  return res.json({ message: "Deleted." });
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Feedback server running → http://localhost:${PORT}`);
  console.log(`Admin dashboard       → http://localhost:${PORT}/admin.html`);
});
