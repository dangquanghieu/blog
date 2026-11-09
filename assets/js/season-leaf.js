/* ─────────────────────────────────────────────────────────────
   Đen và Trắng — một chiếc lá theo mùa bay chéo qua trang
   Thu (9–11): lá phong (momiji) hoặc lá bạch quả (ginkgo)
   Đông (12–2): bông tuyết · Xuân (3–5): hoa đào · Hạ (6–8): lá sen
   Mùa tính theo tháng ở giờ Việt Nam (UTC+7).

   Chế độ (data-mode trên thẻ <script>, lấy từ `season_leaf` trong _config.yml):
     once   — một lần mỗi lượt ghé thăm (mặc định)
     always — mỗi lần tải trang
     off    — tắt
   Thử một mùa khác: thêm ?leaf=spring | summer | autumn | winter | maple | ginkgo vào URL
   (khi có ?leaf=, lá luôn bay, bỏ qua chế độ once).
   Không chạy khi hệ điều hành bật "giảm chuyển động" (prefers-reduced-motion).
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var script = document.currentScript;
  var mode = (script && script.getAttribute('data-mode')) || 'once';

  // Hình vẽ (viewBox -60 -60 120 120). Màu: --s1/--s1d (chính, viền), --s2/--s2d.
  var ART = {
    maple: "<path d=\"M0 0 L0.0 -4.0 L-2.3 -5.9 L-3.9 -7.8 L-5.2 -9.8 L-6.2 -11.7 L-8.0 -15.8 L-7.6 -15.5 L-8.9 -19.6 L-8.1 -19.3 L-9.1 -23.4 L-7.8 -23.2 L-8.4 -27.3 L-6.9 -27.0 L-7.2 -31.1 L-5.4 -30.8 L-5.5 -35.0 L-3.5 -34.7 L-3.5 -38.8 L-1.4 -38.5 L-1.3 -42.6 L-0.0 -42.3 L-1.0 -46.5 L-0.0 -46.2 L-1.0 -50.3 L0.0 -50.0 L0.0 -50.0 L0.0 -50.0 L1.0 -50.3 L0.0 -46.2 L1.0 -46.5 L0.0 -42.3 L1.3 -42.6 L1.4 -38.5 L3.5 -38.8 L3.5 -34.7 L5.5 -35.0 L5.4 -30.8 L7.2 -31.1 L6.9 -27.0 L8.4 -27.3 L7.8 -23.2 L9.1 -23.4 L8.1 -19.3 L8.9 -19.6 L7.6 -15.5 L8.0 -15.8 L6.2 -11.7 L5.2 -9.8 L3.9 -7.8 L2.3 -5.9 L0.0 -4.0Z M0 0 L-2.5 -3.2 L-5.3 -3.2 L-7.6 -3.7 L-9.7 -4.4 L-11.6 -5.2 L-15.3 -7.3 L-14.8 -7.3 L-18.3 -9.6 L-17.5 -9.8 L-20.6 -12.4 L-19.5 -12.9 L-22.3 -15.6 L-21.0 -16.3 L-23.6 -19.2 L-22.1 -20.0 L-24.6 -23.0 L-22.9 -24.0 L-25.3 -27.0 L-23.6 -28.0 L-25.9 -31.2 L-24.8 -31.7 L-27.9 -34.2 L-27.0 -34.6 L-30.2 -37.1 L-29.2 -37.4 L-29.2 -37.4 L-29.2 -37.4 L-28.7 -38.2 L-27.0 -34.6 L-26.4 -35.4 L-24.8 -31.7 L-24.0 -32.7 L-21.5 -29.7 L-20.1 -31.1 L-17.7 -28.1 L-16.4 -29.4 L-14.1 -26.3 L-12.9 -27.6 L-10.7 -24.3 L-9.7 -25.4 L-7.8 -22.0 L-7.0 -23.0 L-5.3 -19.3 L-4.9 -20.0 L-3.5 -16.2 L-3.3 -16.6 L-2.3 -12.5 L-1.9 -10.5 L-1.8 -8.3 L-1.9 -5.9 L-2.5 -3.2Z M0 0 L2.5 -3.2 L1.9 -5.9 L1.8 -8.3 L1.9 -10.5 L2.3 -12.5 L3.3 -16.6 L3.5 -16.2 L4.9 -20.0 L5.3 -19.3 L7.0 -23.0 L7.8 -22.0 L9.7 -25.4 L10.7 -24.3 L12.9 -27.6 L14.1 -26.3 L16.4 -29.4 L17.7 -28.1 L20.1 -31.1 L21.5 -29.7 L24.0 -32.7 L24.8 -31.7 L26.4 -35.4 L27.0 -34.6 L28.7 -38.2 L29.2 -37.4 L29.2 -37.4 L29.2 -37.4 L30.2 -37.1 L27.0 -34.6 L27.9 -34.2 L24.8 -31.7 L25.9 -31.2 L23.6 -28.0 L25.3 -27.0 L22.9 -24.0 L24.6 -23.0 L22.1 -20.0 L23.6 -19.2 L21.0 -16.3 L22.3 -15.6 L19.5 -12.9 L20.6 -12.4 L17.5 -9.8 L18.3 -9.6 L14.8 -7.3 L15.3 -7.3 L11.6 -5.2 L9.7 -4.4 L7.6 -3.7 L5.3 -3.2 L2.5 -3.2Z M0 0 L-3.9 -0.8 L-5.7 0.8 L-7.5 1.8 L-9.1 2.5 L-10.7 3.1 L-14.3 3.9 L-13.8 3.7 L-17.3 4.1 L-16.8 3.5 L-20.2 3.6 L-19.6 2.6 L-22.9 2.5 L-22.2 1.2 L-25.6 0.8 L-24.8 -0.6 L-28.1 -1.2 L-27.4 -2.8 L-30.6 -3.5 L-29.8 -5.1 L-33.1 -5.9 L-32.4 -6.9 L-35.9 -6.8 L-35.3 -7.5 L-38.7 -7.4 L-38.1 -8.1 L-38.1 -8.1 L-38.1 -8.1 L-38.4 -9.0 L-35.3 -7.5 L-35.5 -8.4 L-32.4 -6.9 L-32.6 -8.1 L-29.3 -7.5 L-29.4 -9.3 L-26.1 -8.6 L-26.2 -10.3 L-22.9 -9.5 L-23.0 -11.1 L-19.8 -10.2 L-19.9 -11.6 L-16.8 -10.4 L-17.0 -11.5 L-13.9 -10.0 L-14.1 -10.8 L-11.1 -9.0 L-11.5 -9.4 L-8.5 -7.2 L-7.3 -6.0 L-6.1 -4.7 L-4.9 -3.0 L-3.9 -0.8Z M0 0 L3.9 -0.8 L4.9 -3.0 L6.1 -4.7 L7.3 -6.0 L8.5 -7.2 L11.5 -9.4 L11.1 -9.0 L14.1 -10.8 L13.9 -10.0 L17.0 -11.5 L16.8 -10.4 L19.9 -11.6 L19.8 -10.2 L23.0 -11.1 L22.9 -9.5 L26.2 -10.3 L26.1 -8.6 L29.4 -9.3 L29.3 -7.5 L32.6 -8.1 L32.4 -6.9 L35.5 -8.4 L35.3 -7.5 L38.4 -9.0 L38.1 -8.1 L38.1 -8.1 L38.1 -8.1 L38.7 -7.4 L35.3 -7.5 L35.9 -6.8 L32.4 -6.9 L33.1 -5.9 L29.8 -5.1 L30.6 -3.5 L27.4 -2.8 L28.1 -1.2 L24.8 -0.6 L25.6 0.8 L22.2 1.2 L22.9 2.5 L19.6 2.6 L20.2 3.6 L16.8 3.5 L17.3 4.1 L13.8 3.7 L14.3 3.9 L10.7 3.1 L9.1 2.5 L7.5 1.8 L5.7 0.8 L3.9 -0.8Z M0 0 L-3.5 1.9 L-3.6 3.6 L-3.9 4.9 L-4.3 6.1 L-4.7 7.1 L-6.2 9.2 L-5.9 8.7 L-7.5 10.6 L-7.2 9.8 L-9.0 11.4 L-8.9 10.5 L-10.7 11.9 L-10.7 10.8 L-12.6 12.0 L-12.7 10.7 L-14.7 11.8 L-14.8 10.5 L-16.9 11.5 L-17.0 10.1 L-19.1 11.1 L-19.0 10.1 L-20.7 11.7 L-20.5 10.9 L-22.3 12.6 L-22.1 11.7 L-22.1 11.7 L-22.1 11.7 L-22.9 11.4 L-20.5 10.9 L-21.3 10.6 L-19.0 10.1 L-19.9 9.6 L-17.9 8.4 L-19.0 7.5 L-17.0 6.4 L-18.1 5.6 L-16.0 4.5 L-17.0 3.8 L-14.9 2.9 L-15.9 2.2 L-13.6 1.5 L-14.5 1.0 L-12.2 0.5 L-12.9 0.3 L-10.5 -0.0 L-11.1 0.0 L-8.5 -0.0 L-7.4 0.1 L-6.3 0.5 L-5.0 1.0 L-3.5 1.9Z M0 0 L3.5 1.9 L5.0 1.0 L6.3 0.5 L7.4 0.1 L8.5 -0.0 L11.1 0.0 L10.5 -0.0 L12.9 0.3 L12.2 0.5 L14.5 1.0 L13.6 1.5 L15.9 2.2 L14.9 2.9 L17.0 3.8 L16.0 4.5 L18.1 5.6 L17.0 6.4 L19.0 7.5 L17.9 8.4 L19.9 9.6 L19.0 10.1 L21.3 10.6 L20.5 10.9 L22.9 11.4 L22.1 11.7 L22.1 11.7 L22.1 11.7 L22.3 12.6 L20.5 10.9 L20.7 11.7 L19.0 10.1 L19.1 11.1 L17.0 10.1 L16.9 11.5 L14.8 10.5 L14.7 11.8 L12.7 10.7 L12.6 12.0 L10.7 10.8 L10.7 11.9 L8.9 10.5 L9.0 11.4 L7.2 9.8 L7.5 10.6 L5.9 8.7 L6.2 9.2 L4.7 7.1 L4.3 6.1 L3.9 4.9 L3.6 3.6 L3.5 1.9Z\" fill=\"var(--s1)\"/><circle r=\"7\" fill=\"var(--s1)\"/><path d=\"M0 0L6 46\" fill=\"none\" stroke=\"var(--s1d)\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>",
    ginkgo: "<path d=\"M0 0 C-3.7 -9.2 -22.3 -10.1 -31.9 -18.4 L-33.3 -21.6 L-33.1 -24.0 L-32.3 -26.1 L-31.0 -27.9 L-29.4 -29.4 L-27.9 -30.9 L-26.4 -32.6 L-25.1 -34.5 L-23.7 -36.5 L-22.2 -38.4 L-20.4 -40.0 L-18.3 -41.0 L-16.0 -41.7 L-13.7 -42.1 L-11.4 -42.5 L-9.2 -43.1 L-6.9 -43.6 L-4.4 -41.7 L-2.0 -38.1 L0.0 -33.0 L2.0 -38.1 L4.4 -41.7 L6.9 -43.6 L9.2 -43.1 L11.4 -42.5 L13.7 -42.1 L16.0 -41.7 L18.3 -41.0 L20.4 -40.0 L22.2 -38.4 L23.7 -36.5 L25.1 -34.5 L26.4 -32.6 L27.9 -30.9 L29.4 -29.4 L31.0 -27.9 L32.3 -26.1 L33.1 -24.0 L33.3 -21.6 L31.9 -18.4 C22.3 -10.1 3.7 -9.2 0 0Z\" fill=\"var(--s2)\"/><path d=\"M0 -1 L-28.3 -22.1 M0 -1 L-24.6 -26.1 M0 -1 L-20.4 -29.5 M0 -1 L-15.7 -32.2 M0 -1 L-10.7 -34.3 M0 -1 L-5.4 -35.5 M0 -1 L0.0 -35.9 M0 -1 L5.4 -35.5 M0 -1 L10.7 -34.3 M0 -1 L15.7 -32.2 M0 -1 L20.4 -29.5 M0 -1 L24.6 -26.1 M0 -1 L28.3 -22.1\" fill=\"none\" stroke=\"var(--s2d)\" stroke-width=\".8\" opacity=\".55\"/><path d=\"M0 0C-1 10-4 22-2 34\" fill=\"none\" stroke=\"var(--s2d)\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>",
    blossom: "<path d=\"M0.0 -4.0 Q-23.1 -13.2 -19.7 -38.0 Q-9.2 -43.1 0.0 -37.8 Q9.2 -43.1 19.7 -38.0 Q23.1 -13.2 0.0 -4.0Z M3.8 -1.2 Q5.4 -26.0 30.0 -30.5 Q38.2 -22.1 36.0 -11.7 Q43.9 -4.5 42.2 7.0 Q19.7 17.9 3.8 -1.2Z M2.4 3.2 Q26.4 -2.9 38.3 19.1 Q32.8 29.5 22.2 30.6 Q17.9 40.3 6.4 42.3 Q-10.9 24.3 2.4 3.2Z M-2.4 3.2 Q10.9 24.3 -6.4 42.3 Q-17.9 40.3 -22.2 30.6 Q-32.8 29.5 -38.3 19.1 Q-26.4 -2.9 -2.4 3.2Z M-3.8 -1.2 Q-19.7 17.9 -42.2 7.0 Q-43.9 -4.5 -36.0 -11.7 Q-38.2 -22.1 -30.0 -30.5 Q-5.4 -26.0 -3.8 -1.2Z\" fill=\"var(--s1)\"/><path d=\"M0 0 L11.1 -11.5 M0 0 L15.2 4.9 M0 0 L-2.2 15.8 M0 0 L-15.2 4.9 M0 0 L-7.5 -14.1\" fill=\"none\" stroke=\"var(--s1d)\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><circle cx=\"11.8\" cy=\"-12.2\" r=\"2.6\" fill=\"var(--s1d)\"/><circle cx=\"16.2\" cy=\"5.3\" r=\"2.6\" fill=\"var(--s1d)\"/><circle cx=\"-2.4\" cy=\"16.8\" r=\"2.6\" fill=\"var(--s1d)\"/><circle cx=\"-16.2\" cy=\"5.3\" r=\"2.6\" fill=\"var(--s1d)\"/><circle cx=\"-8.0\" cy=\"-15.0\" r=\"2.6\" fill=\"var(--s1d)\"/><circle r=\"5\" fill=\"var(--s2)\"/>",
    lotusLeaf: "<path d=\"M0 0 L8.0 -45.3 L12.8 -45.6 L17.0 -43.5 L20.5 -40.1 L24.2 -37.7 L28.7 -36.3 L32.9 -34.1 L35.4 -30.1 L36.9 -25.5 L39.3 -21.8 L42.8 -18.4 L45.1 -14.4 L45.1 -9.6 L44.4 -4.9 L45.2 -0.5 L46.7 4.1 L46.5 8.8 L44.0 12.9 L41.4 16.7 L40.2 21.1 L39.3 25.9 L36.6 29.7 L32.4 32.0 L28.5 34.3 L25.6 37.9 L22.4 41.6 L18.1 43.3 L13.2 43.3 L8.8 43.8 L4.5 45.8 L0.0 47.3 L-4.6 46.5 L-8.9 44.2 L-13.1 42.8 L-17.8 42.7 L-22.5 41.7 L-26.0 38.5 L-28.6 34.5 L-32.0 31.6 L-36.2 29.3 L-39.6 26.0 L-40.9 21.4 L-41.5 16.8 L-43.3 12.7 L-46.0 8.7 L-47.1 4.1 L-45.8 -0.5 L-44.4 -4.9 L-44.4 -9.4 L-44.8 -14.3 L-43.3 -18.7 L-39.8 -22.1 L-36.7 -25.4 L-34.8 -29.6 L-32.8 -34.0 L-29.1 -36.8 L-24.4 -38.1 L-20.3 -39.8 L-16.7 -42.9 L-12.8 -45.6 L-8.1 -46.0Z\" fill=\"var(--s1)\"/><path d=\"M0 0 L19.6 -33.9 M0 0 L34.9 -17.5 M0 0 L38.8 4.5 M0 0 L30.0 25.1 M0 0 L11.2 37.5 M0 0 L-11.2 37.5 M0 0 L-30.0 25.1 M0 0 L-38.8 4.5 M0 0 L-34.9 -17.5 M0 0 L-19.6 -33.9\" fill=\"none\" stroke=\"var(--s1d)\" stroke-width=\"1.4\" opacity=\".6\"/><circle r=\"4\" fill=\"var(--s1d)\"/>",
    snow: "<path d=\"M0 0 L40.0 0.0 M0 0 L20.0 34.6 M0 0 L-20.0 34.6 M0 0 L-40.0 0.0 M0 0 L-20.0 -34.6 M0 0 L20.0 -34.6 M26.5 -14.1 L24.0 0.0 L26.5 14.1 M25.4 15.9 L12.0 20.8 L1.0 30.0 M-1.0 30.0 L-12.0 20.8 L-25.4 15.9 M-26.5 14.1 L-24.0 0.0 L-26.5 -14.1 M-25.4 -15.9 L-12.0 -20.8 L-1.0 -30.0 M1.0 -30.0 L12.0 -20.8 L25.4 -15.9\" fill=\"none\" stroke=\"var(--s2)\" stroke-width=\"5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>"
  };

  // Màu từng hình; [sáng, tối] — tối dùng khi trang ở giao diện tối.
  var COLORS = {
    maple:     [{ s1: '#c8501a', s1d: '#9a3412' }, { s1: '#d8673a', s1d: '#a8461f' }],
    ginkgo:    [{ s2: '#e0a62a', s2d: '#a87612' }, { s2: '#dcae48', s2d: '#9c7220' }],
    blossom:   [{ s1: '#f2a7bb', s1d: '#cf5a80', s2: '#f3cf6a' }, { s1: '#e39ab0', s1d: '#b8587c', s2: '#e0bd5c' }],
    lotusLeaf: [{ s1: '#4f9d6e', s1d: '#2f7350' }, { s1: '#5aa679', s1d: '#2f7350' }],
    snow:      [{ s2: '#8fb0d9' }, { s2: '#c9d9ee' }]
  };

  var BY_SEASON = { spring: ['blossom'], summer: ['lotusLeaf'], autumn: ['maple', 'ginkgo'], winter: ['snow'] };
  var MONTH_SEASON = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer',
                      'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];

  // ── Có chạy không? ────────────────────────────────────────
  var forced = null;
  try { forced = new URLSearchParams(location.search).get('leaf'); } catch (e) {}
  if (forced && !BY_SEASON[forced] && !ART[forced]) forced = null;

  if (mode === 'off' && !forced) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!forced && mode !== 'always') {
    try {
      if (sessionStorage.getItem('dvt-leaf')) return;
      sessionStorage.setItem('dvt-leaf', '1');
    } catch (e) { /* không có sessionStorage: cứ bay */ }
  }
  if (!document.documentElement.animate) return;   // trình duyệt quá cũ

  // ── Chọn hình ─────────────────────────────────────────────
  var season = MONTH_SEASON[new Date(Date.now() + 7 * 3600e3).getUTCMonth()];
  var name;
  if (forced && ART[forced]) name = forced;
  else {
    var list = BY_SEASON[forced || season];
    name = list[Math.floor(Math.random() * list.length)];
  }
  var isSnow = name === 'snow';

  function rand(a, b) { return a + Math.random() * (b - a); }

  function fly() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var col = COLORS[name][dark ? 1 : 0];

    var size = isSnow ? rand(28, 34) : rand(42, 52);
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-60 -60 120 120');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'season-leaf');
    svg.innerHTML = ART[name];   // hình cố định trong file này, không phải dữ liệu người dùng
    for (var k in col) svg.style.setProperty('--' + k, col[k]);
    svg.style.width = svg.style.height = size + 'px';
    svg.style.marginLeft = svg.style.marginTop = (-size / 2) + 'px';

    // ── Quỹ đạo: chéo từ trên xuống, lúc đầu nhanh rồi chậm dần ─
    var W = window.innerWidth, H = window.innerHeight;
    var ltr = Math.random() < 0.3;                         // 30% bay từ trái sang phải
    var x0 = W * (ltr ? rand(0.10, 0.35) : rand(0.65, 0.92));
    var x1 = W * (ltr ? rand(0.65, 0.90) : rand(0.10, 0.35));
    if (isSnow) x1 = x0 + (x1 - x0) * 0.55;                // tuyết rơi dốc hơn
    var y0 = -size, y1 = H * rand(0.86, 0.98);
    var dir = ltr ? 1 : -1;

    var N = 48, frames = [];
    var spin = (isSnow ? rand(90, 160) : rand(200, 330)) * dir;
    var r0 = rand(-40, 40);
    var swayA = isSnow ? Math.min(W * 0.03, 24) : Math.min(W * 0.05, 46);
    var swayF = isSnow ? 2.2 : rand(1.4, 1.9);
    var flipF = rand(2.0, 2.8);
    var phase = rand(0, Math.PI * 2);

    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      var p = 1 - Math.pow(1 - t, 2.6);                    // nhanh → chậm
      var amp = swayA * (0.25 + 0.75 * t);                 // càng chậm càng chao
      var x = x0 + (x1 - x0) * p + amp * Math.sin(2 * Math.PI * swayF * t + phase);
      var y = y0 + (y1 - y0) * p;
      var rot = r0 + spin * p + (isSnow ? 0 : 18 * Math.sin(2 * Math.PI * swayF * t + phase + 1));
      var flip = isSnow ? 1 : 0.35 + 0.65 * Math.abs(Math.cos(Math.PI * flipF * t + phase));
      var op = t < 0.03 ? t / 0.03 : (t > 0.82 ? Math.max(0, (1 - t) / 0.18) : 1);
      frames.push({
        transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg) scaleX(' + flip.toFixed(3) + ')',
        opacity: +(op * 0.92).toFixed(3)
      });
    }

    document.body.appendChild(svg);
    var anim = svg.animate(frames, { duration: isSnow ? 9000 : rand(6500, 7500), easing: 'linear', fill: 'forwards' });
    var done = function () { if (svg.parentNode) svg.parentNode.removeChild(svg); };
    anim.onfinish = done;
    anim.oncancel = done;
  }

  function start() { setTimeout(fly, 700); }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
