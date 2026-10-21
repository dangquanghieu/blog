---
title: Nước đầu tiên
date: 2026-10-22 09:00
stone: black          # black (mặc định) hoặc white
tags: [ghi chú]
math: true            # chỉ bật khi bài có công thức
---

*Bài thử để kiểm tra theme — xoá đi khi bắt đầu viết bài thật.*

Đoạn văn thường, với một [liên kết](https://dangquanghieu.com) và một chút **chữ đậm**. Chữ Việt có dấu chồng: ưỡ, ặ, ổ, ữ, Ặ, Ỗ.

## Một tiêu đề phụ

> Một câu trích dẫn — chỉ thụt lề và in nghiêng, không viền.

Công thức trong dòng: $$X(e^{j\omega}) = \sum_{n=-\infty}^{\infty} x[n]\, e^{-j\omega n}$$, và công thức riêng dòng có đánh số:

$$
y[n] = (x * h)[n] = \sum_{k=-\infty}^{\infty} x[k]\, h[n-k] \tag{1} \label{eq:chap}
$$

Tham chiếu lại phép chập ở $$\eqref{eq:chap}$$.

```python
import numpy as np
x = np.array([1, 2, 3])
h = np.array([1, -1])
y = np.convolve(x, h)   # chập tuyến tính
```
