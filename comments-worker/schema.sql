-- Bình luận cho blog "Đen và Trắng" (Cloudflare D1 / SQLite)
CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  page        TEXT    NOT NULL,                 -- đường dẫn bài, ví dụ /2026/10/van-4-nuoc-78/
  name        TEXT    NOT NULL,
  body        TEXT    NOT NULL,                 -- văn bản thuần, không HTML
  created_at  INTEGER NOT NULL,                 -- unix time (ms)
  status      TEXT    NOT NULL DEFAULT 'visible', -- visible | hidden
  is_owner    INTEGER NOT NULL DEFAULT 0,       -- 1 = bạn trả lời từ trang quản trị
  ip_hash     TEXT,                             -- SHA-256(IP + muối), không lưu IP gốc
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_page ON comments (page, status, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_ip   ON comments (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_time ON comments (created_at);
