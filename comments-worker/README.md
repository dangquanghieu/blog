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
printf 'ADMIN_TOKEN="test"\nIP_SALT="test"\nDEV_SKIP_TURNSTILE="1"\n' > .dev.vars    # bỏ qua Turnstile khi thử cục bộ
npx wrangler d1 execute den-va-trang-comments --local --file=schema.sql
npx wrangler dev                                      # API ở http://127.0.0.1:8787
```

Khi đó đặt tạm `comments.api: "http://127.0.0.1:8787"` và `turnstile_sitekey: ""`
trong `_config.yml` của blog, chạy `bundle exec jekyll serve`. Nhớ trả lại trước khi push.

## Vận hành

Địa chỉ hiện tại:
- API: `https://den-va-trang-comments.dangquanghieu.workers.dev`
- Quản trị: `https://den-va-trang-comments.dangquanghieu.workers.dev/admin` (mật khẩu `ADMIN_TOKEN`, lưu trong Apple Passwords)
- Turnstile site key: trong `_config.yml` của blog (`comments.turnstile_sitekey`)

Mọi lệnh `npx wrangler …` chạy trong thư mục `comments-worker/`.

### Thường ngày
- Bình luận hiện ngay. Thỉnh thoảng mở trang `/admin` để xem; **Ẩn** (giữ lại, có thể hiện lại)
  hoặc **Xoá hẳn** bình luận không phù hợp; **Trả lời** để đăng với tên tác giả.
- Muốn được báo khi có bình luận mới: bật Telegram (mục trên).

### Khi spam tăng
1. Thêm từ khoá vào `BLOCKLIST` trong `wrangler.toml` (cách nhau dấu phẩy), rồi `npx wrangler deploy`.
2. Siết `MAX_LINKS` (ví dụ `"0"` hoặc `"1"`) hoặc `RATE_LIMIT` (ví dụ `"1"`), rồi deploy.
3. Xoá hàng loạt spam theo từ khoá:
   ```bash
   npx wrangler d1 execute den-va-trang-comments --remote \
     --command "DELETE FROM comments WHERE is_owner = 0 AND body LIKE '%tu-khoa%'"
   ```
4. Tạm khoá bình luận toàn blog: đặt `comments.api: ""` trong `_config.yml` của blog rồi push
   (dữ liệu cũ vẫn còn trong D1, bật lại là hiện như cũ). Tắt cho một bài: `comments: false`.

### Sao lưu (vài tháng một lần)
```bash
npx wrangler d1 export den-va-trang-comments --remote --output=backup-$(date +%Y%m%d).sql
```
File sao lưu chứa nội dung bình luận: **không commit vào repo public**, cất ở nơi riêng.

### Đổi mật khẩu quản trị
```bash
openssl rand -hex 24
npx wrangler secret put ADMIN_TOKEN       # cập nhật luôn trong Apple Passwords
```

### Sửa code Worker
Sửa `src/index.js` hoặc `wrangler.toml` → `npx wrangler deploy` → commit + push repo.
Code trong repo chỉ là bản lưu; Cloudflare chỉ chạy bản đã `deploy`.

### Sự cố đã gặp và cách xử lý
- **Đăng ký subdomain workers.dev báo "invalid" mọi tên:** đăng ký/đổi trên dashboard
  (Workers & Pages → Subdomain) thay vì trong lệnh `wrangler deploy`.
  Đổi subdomain làm đổi địa chỉ mọi Worker → phải sửa `comments.api` trong `_config.yml`.
- **`d1 create` xong nhưng `database_id` vẫn là chuỗi giữ chỗ:** lấy uuid bằng
  `npx wrangler d1 list` rồi điền vào `wrangler.toml`.
- **Dashboard Turnstile cảnh báo "Siteverify isn't being called":** kiểm tra
  `npx wrangler secret list` có `TURNSTILE_SECRET`; nếu có thì gửi thử một bình luận trong lúc
  chạy `npx wrangler tail`. Bình luận đăng được = siteverify thành công (Worker từ chối mọi bình luận
  khi thiếu secret hoặc khi xác minh thất bại). Cảnh báo trên dashboard cập nhật chậm.
  Không cần dùng "Fix it with Spin".
- **Bình luận báo "Không xác minh được bạn không phải bot":** Secret key không khớp Site key, hoặc
  hostname của widget Turnstile không có `blog.dangquanghieu.com`.
- **Bình luận báo "Hệ thống bình luận đang được cấu hình":** Worker thiếu `TURNSTILE_SECRET`.
- **Khung bình luận không hiện trên blog:** `comments.api` trong `_config.yml` trống hoặc chưa
  được commit/push; kiểm tra `git status`.

## Quyền riêng tư

Chỉ lưu tên, nội dung, thời gian, user-agent và **giá trị băm** của IP (SHA-256 kèm muối)
để giới hạn tần suất — không lưu IP gốc, không lưu email.
