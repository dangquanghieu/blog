---
title: Nước thứ hai, quân trắng
date: 2026-10-22 10:00
stone: white
tags: [ảnh]
---

*Bài thử thứ hai, để xem chấm quân trắng trong danh sách và điều hướng giữa hai bài. Xoá đi khi viết bài thật.*

Khi cần nhúng một ảnh từ Flickr vào bài, viết thẳng dòng include sau vào file Markdown (thay URL thật):

```liquid
{% raw %}{% include flickr.html
   src="https://live.staticflickr.com/65535/<id>_<secret>_h.jpg"
   page="https://www.flickr.com/photos/<username>/<id>/"
   title="Tên ảnh" alt="Mô tả ngắn" wide=true %}{% endraw %}
```

`wide=true` cho ảnh tràn rộng hơn cột chữ; bỏ đi thì ảnh nằm gọn trong cột.
