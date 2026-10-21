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

## Bình luận (tuỳ chọn)

Bật Discussions cho repo, cài app giscus, lấy 4 giá trị ở https://giscus.app rồi điền vào
mục `giscus:` trong `_config.yml`.
