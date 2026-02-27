-- ══════════════════════════════════════════════════════
-- BASE64 CYBERSHIELD — Cloudflare D1 Database Schema
-- Run: wrangler d1 execute cybershield-contacts --file=schema.sql
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) <= 100),
  email TEXT NOT NULL CHECK(length(email) <= 254),
  company TEXT DEFAULT '' CHECK(length(company) <= 150),
  service TEXT DEFAULT '' CHECK(length(service) <= 200),
  message TEXT NOT NULL CHECK(length(message) <= 2000),
  ip TEXT DEFAULT '' CHECK(length(ip) <= 45),
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'new' CHECK(status IN ('new', 'read', 'replied', 'archived'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_email ON contact_submissions(email);
