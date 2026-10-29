# Bình luận cho "Đen và Trắng" — Cloudflare Worker + D1

Blog vẫn ở GitHub Pages. Thư mục này là một API nhỏ chạy trên Cloudflare (miễn phí),
lưu bình luận trong D1 (SQLite). Bình luận hiện ngay sau khi gửi; bot bị chặn bằng
Turnstile, ô bẫy, thời gian điền form, giới hạn tần suất theo IP, giới hạn link, từ khoá cấm.

Jekyll bỏ qua thư mục này (`exclude` trong `_config.yml`).

## Cài đặt lần đầu

Cần Node.js (`brew install node`) và một tài khoản Cloudflare miễn phí.

```bash
cd ~/Projects/den-va-trang/comments-worker

# 1. Đăng nhập Cloudflare (mở trình duyệt để xác nhận)
npx wrangler login

# 2. Tạo cơ sở dữ liệu, chép "database_id" in ra vào wrangler.toml
npx wrangler d1 create den-va-trang-comments

# 3. Tạo bảng
npx wrangler d1 execute den-va-trang-comments --remote --file=schema.sql

# 4. Mật khẩu trang quản trị và muối băm IP (dán chuỗi ngẫu nhiên khi được hỏi)
openssl rand -hex 24          # chạy 2 lần, lấy 2 chuỗi khác nhau
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put IP_SALT
```

**5. Turnstile** (chống bot): Cloudflare dashboard → *Turnstile* → *Add widget*
- Hostname: `blog.dangquanghieu.com` (thêm `localhost` nếu muốn thử khi chạy `jekyll serve`)
- Widget mode: *Managed*
- Lưu lại **Site key** (công khai) và **Secret key**.

```bash
npx wrangler secret put TURNSTILE_SECRET     # dán Secret key

# 6. Deploy — lệnh in ra địa chỉ dạng https://den-va-trang-comments.<tài-khoản>.workers.dev
npx wrangler deploy
```

**7. Bật trên blog:** trong `_config.yml` của blog, điền:

```yaml
comments:
  api: "https://den-va-trang-comments.<tài-khoản>.workers.dev"
  turnstile_sitekey: "<Site key>"
```

rồi commit + push blog như bình thường.

## Quản trị

Mở `https://den-va-trang-comments.<tài-khoản>.workers.dev/admin`, nhập `ADMIN_TOKEN`.
Xem 200 bình luận mới nhất của mọi bài; **Ẩn** / **Hiện lại** / **Xoá hẳn** / **Trả lời**
(trả lời hiện với tên `OWNER_NAME` và nhãn "tác giả").

Tắt bình luận cho một bài: thêm `comments: false` vào front matter của bài đó.

## Báo bình luận mới qua Telegram (tuỳ chọn)

1. Trên Telegram, nhắn `@BotFather` → `/newbot` → lấy **bot token**.
2. Nhắn một tin bất kỳ cho bot vừa tạo, rồi mở
   `https://api.telegram.org/bot<TOKEN>/getUpdates` để lấy `chat.id`.
3. ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put TELEGRAM_CHAT_ID
   ```

Không cần deploy lại sau khi đặt secret.

## Tinh chỉnh

Trong `wrangler.toml` (`[vars]`), sửa xong chạy `npx wrangler deploy`:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `MAX_LINKS` | 2 | số link tối đa mỗi bình luận |
| `RATE_LIMIT` | 3 | số bình luận tối đa mỗi IP trong 10 phút |
| `BLOCKLIST` | (trống) | từ khoá cấm, cách nhau bằng dấu phẩy |
| `ALLOWED_ORIGINS` | blog + localhost | trang được phép gọi API |
| `OWNER_NAME` | Đặng Quang Hiếu | tên khi bạn trả lời |

## Các lệnh hay dùng

```bash
npx wrangler tail                                     # xem log trực tiếp
npx wrangler d1 execute den-va-trang-comments --remote \
  --command "SELECT id, page, name, substr(body,1,60) FROM comments ORDER BY id DESC LIMIT 20"
npx wrangler d1 export den-va-trang-comments --remote --output=backup.sql   # sao lưu
```

## Chạy thử trên máy

```bash
printf 'ADMIN_TOKEN="test"\nIP_SALT="test"\n' > .dev.vars    # không có TURNSTILE_SECRET → bỏ qua Turnstile
npx wrangler d1 execute den-va-trang-comments --local --file=schema.sql
npx wrangler dev                                      # API ở http://127.0.0.1:8787
```

Khi đó đặt tạm `comments.api: "http://127.0.0.1:8787"` và `turnstile_sitekey: ""`
trong `_config.yml` của blog, chạy `bundle exec jekyll serve`. Nhớ trả lại trước khi push.

## Quyền riêng tư

Chỉ lưu tên, nội dung, thời gian, user-agent và **giá trị băm** của IP (SHA-256 kèm muối)
để giới hạn tần suất — không lưu IP gốc, không lưu email.
