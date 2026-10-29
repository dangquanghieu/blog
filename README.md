# Đen và Trắng

Blog cá nhân, Jekyll 4, theme tự viết (không phụ thuộc theme ngoài, không dùng Sass).

## Cấu trúc

```
_config.yml            cấu hình chung (tên, tác giả, link footer, giscus)
_data/home_photo.yml   ảnh Flickr ở cuối trang chủ — đổi ảnh chỉ sửa file này
_posts/                bài viết (YYYY-MM-DD-ten-bai.md)
_layouts/              default, home, post, page
_includes/             head, header, footer, move (số 手), flickr, mathjax, giscus
assets/css/main.css    toàn bộ giao diện (biến màu ở đầu file)
about.md               trang Giới thiệu
.github/workflows/     build + deploy bằng GitHub Actions
```

## Chạy trên máy (macOS)

Cài Ruby lần đầu (Ruby đi kèm macOS đã cũ, không dùng được với Jekyll 4):

```bash
brew install ruby
echo "export PATH=\"$(brew --prefix ruby)/bin:\$PATH\"" >> ~/.zshrc
source ~/.zshrc
ruby -v                      # phải là 3.x
```

Cài gem và chạy:

```bash
cd ~/Projects/den-va-trang
bundle config set --local path vendor/bundle
bundle install
bundle lock --add-platform x86_64-linux     # để GitHub Actions dùng được Gemfile.lock
bundle exec jekyll serve --livereload       # http://127.0.0.1:4000
```

Sửa `_config.yml` thì phải dừng (Ctrl-C) và chạy lại; các file khác tự nạp lại.

## Quy trình viết bài

```bash
cd ~/Projects/den-va-trang

# 1. Tạo file bài mới trong _posts/, tên dạng YYYY-MM-DD-ten-bai.md
code _posts/2026-10-25-ten-bai.md

# 2. (Tuỳ chọn) Xem trước trên máy — nên làm khi bài có công thức hoặc ảnh
bundle exec jekyll serve --livereload     # mở http://127.0.0.1:4000, Ctrl-C để dừng

# 3. Đưa lên: GitHub tự build và cập nhật site sau khoảng 1 phút
git add _posts/2026-10-25-ten-bai.md
git commit -m "Bài mới: ten-bai"
git push
```

Kiểm tra build trên GitHub: `gh run list --limit 3` (✓ xong · X lỗi · * đang chạy).
Chờ lần build mới nhất chạy xong rồi mới trả dấu nhắc:
`gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId') --exit-status`
(Ctrl-C để thoát bất cứ lúc nào — chỉ dừng việc theo dõi, không huỷ build.)
Nếu build lỗi: `gh run view --log-failed`.

Đổi ảnh trang chủ: sửa `_data/home_photo.yml`, rồi commit + push như bước 3.

## Trang chủ và trang Ghi chép

- Trang chủ hiện `home_posts` bài mới nhất (mặc định 7), kèm link "Tất cả ghi chép →"
  khi có nhiều bài hơn.
- Menu "Ghi chép" dẫn tới `/ghi-chep/`: toàn bộ bài, nhóm theo năm, `paginate` bài mỗi trang
  (mặc định 20); các trang sau ở `/ghi-chep/trang/2/`, `/ghi-chep/trang/3/`…
- Hai con số này chỉnh trong `_config.yml`. Phân trang dùng plugin `jekyll-paginate`
  (sau khi thêm vào Gemfile phải chạy `bundle install` một lần và commit `Gemfile.lock`).

## Viết bài

```yaml
---
title: Về khoảng trống trên bàn cờ
date: 2026-10-18 21:00      # không bắt buộc; mặc định lấy từ tên file
stone: white                # black (mặc định) | white — chấm quân trong danh sách
tags: [cờ vây, suy ngẫm]
math: true                  # chỉ khi bài có công thức
move: 24                    # không bắt buộc; ghi đè số 手 tự đếm
comments: false             # không bắt buộc; tắt bình luận cho bài này
---
```

- **Ngày đăng**: Jekyll không đăng bài có `date` ở tương lai (so với lúc build). Bỏ trống `date:` thì
  lấy ngày ở tên file, lúc 00:00. Bài hẹn giờ chỉ hiện khi có một lần build chạy sau thời điểm đó
  (`gh workflow run Deploy`).
- **Số 手** tự đếm theo ngày đăng (bài cũ nhất = 1). Xoá một bài cũ thì các số sau bị dịch;
  muốn cố định thì ghi `move:` trong front matter.
- **Bản nháp**: để ngoài repo, hoặc trong `_drafts/` (không có ngày ở tên file) và xem bằng
  `bundle exec jekyll serve --drafts`. Lưu ý: repo public thì `_drafts/` cũng public.
- **Công thức** (kramdown + MathJax): dùng `$$…$$` cho cả trong dòng lẫn riêng dòng —
  kramdown tự chuyển thành `\(…\)` và `\[…\]`. Không dùng `$…$` đơn.
  Đánh số: `\tag{1} \label{eq:x}`, tham chiếu `$$\eqref{eq:x}$$`.
  Không đặt `\begin{equation}`/`align` bên trong `$$…$$` (MathJax báo lỗi lồng môi trường);
  với nhiều dòng dùng `\begin{aligned}…\end{aligned}`.
  Macro dùng chung khai báo trong `_includes/mathjax.html`.
- **Ảnh Flickr trong bài** (khi cần):

  ```liquid
  {% include flickr.html src="https://live.staticflickr.com/…_h.jpg"
       page="https://www.flickr.com/photos/<username>/<id>/"
       title="Tên ảnh" alt="Mô tả" wide=true %}
  ```

## Ván cờ SGF

File `.sgf` đặt trong `assets/sgf/` (tên chữ thường, không dấu, mã hoá UTF-8). Trong bài:

```liquid
{% include sgf.html file="/assets/sgf/ten-van.sgf" %}             tua được, bắt đầu từ bàn trống
{% include sgf.html file="/assets/sgf/ten-van.sgf" move=78 %}     tua được, mở ở nước 78
{% include sgf.html file="/assets/sgf/ten-van.sgf" move=78 static=true numbers=8 coords=true
     caption="Hình 1. Thế cờ sau nước 78" %}                      hình tĩnh, đánh số 8 nước cuối
```

| Tham số | Ý nghĩa |
|---|---|
| `file` | đường dẫn file SGF (bắt buộc) |
| `move` | nước hiển thị ban đầu (mặc định 0; hình tĩnh mặc định là nước cuối) |
| `static=true` | chỉ vẽ thế cờ, không có nút tua |
| `numbers=N` | ghi số trên N quân vừa đi gần nhất |
| `coords=true` | hiện toạ độ A–T / 1–19 |
| `caption="…"` | chú thích dưới bàn cờ |
| `info=false` | ẩn dòng tên kỳ thủ / kết quả |
| `comments=false` | ẩn bình luận `C[]` có sẵn trong file |

Trình xem (`assets/js/sgf.js`) chỉ đọc nhánh chính, bỏ qua các nhánh biến. Bình luận `C[]`
trong file hiện dưới bàn cờ theo từng nước. Tua bằng nút, thanh trượt, hoặc phím ← → Home End
sau khi bấm vào bàn cờ.

## Đưa lên GitHub

```bash
cd ~/Projects/den-va-trang
git init -b main
git add .
git commit -m "Khởi tạo blog Đen và Trắng"
gh repo create blog --public --source=. --push

# Bật Pages, nguồn build = GitHub Actions
gh api -X POST repos/{owner}/blog/pages -f build_type=workflow
```

Đặt tên repo là `blog` để có sẵn phương án `dangquanghieu.com/blog`.

### Chọn địa chỉ

**A. `dangquanghieu.com/blog`** — không cần làm thêm gì. Vì user site của bạn đã gắn
`dangquanghieu.com`, repo `blog` tự được phục vụ tại `dangquanghieu.com/blog/`.
Workflow tự đặt `baseurl: /blog`. Chỉ cần chắc site chính không có sẵn trang/thư mục `/blog`.

**B. `blog.dangquanghieu.com`**

1. DNS: thêm bản ghi `blog  CNAME  <username>.github.io.`
2. Gắn domain cho repo:
   ```bash
   gh api -X PUT repos/{owner}/blog/pages -f cname=blog.dangquanghieu.com
   ```
3. Khi chứng chỉ đã cấp (vài phút đến vài giờ), bật HTTPS:
   ```bash
   gh api -X PUT repos/{owner}/blog/pages -F https_enforced=true
   ```
4. Nên verify domain ở cấp tài khoản (GitHub Settings → Pages → Add a verified domain)
   để tránh bị chiếm subdomain.

Đổi giữa A và B không cần sửa code: workflow lấy `url`/`baseurl` từ cấu hình Pages.
Sau khi đổi, chạy lại workflow: `gh workflow run Deploy`.

## Bình luận (Cloudflare)

Bình luận tự dựng, không cần đăng nhập, hiện ngay sau khi gửi: API trong thư mục
`comments-worker/` chạy trên Cloudflare Workers + D1, blog vẫn ở GitHub Pages.
Cài đặt, quản trị, Telegram: xem `comments-worker/README.md`.
Bật bằng `comments.api` + `comments.turnstile_sitekey` trong `_config.yml`;
tắt cho một bài bằng `comments: false` trong front matter.

## Bình luận bằng giscus (phương án cũ, tuỳ chọn)

Bật Discussions cho repo, cài app giscus, lấy 4 giá trị ở https://giscus.app rồi điền vào
mục `giscus:` trong `_config.yml`.
