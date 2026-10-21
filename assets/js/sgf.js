/* ─────────────────────────────────────────────────────────────
   Đen và Trắng — trình xem SGF tối giản
   Đọc nhánh chính (main line) của file SGF, vẽ bàn cờ bằng SVG
   theo màu của theme. Không phụ thuộc thư viện ngoài.

   Dùng qua _includes/sgf.html. Thuộc tính trên <figure class="sgf">:
     data-sgf      đường dẫn file .sgf
     data-move     nước hiển thị ban đầu (mặc định: 0, hoặc nước cuối nếu static)
     data-static   chỉ vẽ thế cờ, không có nút tua
     data-coords   hiện toạ độ A–T / 1–19
     data-numbers  đánh số N nước gần nhất trên quân (ví dụ 10)
     data-info     "0" để ẩn dòng tên kỳ thủ / kết quả
     data-comments "0" để ẩn bình luận C[] trong file
   ───────────────────────────────────────────────────────────── */
(function (root) {
  'use strict';

  /* ── Phân tích cú pháp SGF ─────────────────────────────── */
  function parse(text) {
    var pos = text.indexOf('(');
    if (pos < 0) throw new Error('Không tìm thấy dữ liệu SGF');

    function ws() { while (pos < text.length && /\s/.test(text[pos])) pos++; }

    function node() {
      var props = {};
      for (;;) {
        ws();
        var start = pos;
        while (pos < text.length && /[A-Za-z]/.test(text[pos])) pos++;
        if (pos === start) return props;
        var id = text.slice(start, pos).replace(/[a-z]/g, '');
        var vals = [];
        ws();
        while (text[pos] === '[') {
          pos++;
          var v = '';
          while (pos < text.length && text[pos] !== ']') {
            if (text[pos] === '\\') {
              pos++;
              if (text[pos] === '\r') { pos++; if (text[pos] === '\n') pos++; continue; }
              if (text[pos] === '\n') { pos++; continue; }
            }
            v += text[pos++];
          }
          pos++;
          vals.push(v);
          ws();
        }
        props[id] = (props[id] || []).concat(vals);
      }
    }

    function tree() {
      ws();
      if (text[pos] !== '(') throw new Error('SGF sai cấu trúc');
      pos++;
      var t = { nodes: [], children: [] };
      for (;;) {
        ws();
        if (pos >= text.length) throw new Error('SGF bị cắt cụt');
        var c = text[pos];
        if (c === ';') { pos++; t.nodes.push(node()); }
        else if (c === '(') t.children.push(tree());
        else if (c === ')') { pos++; return t; }
        else pos++;
      }
    }

    var t = tree(), line = [];
    while (t) { line = line.concat(t.nodes); t = t.children[0]; }
    return line;
  }

  /* ── Luật cờ: đặt quân, bắt quân ───────────────────────── */
  function pt(s, size) {
    if (!s || s.length < 2) return null;
    var x = s.charCodeAt(0) - 97, y = s.charCodeAt(1) - 97;
    if (x < 0 || y < 0 || x >= size || y >= size) return null;   // "" hoặc "tt" = bỏ lượt
    return y * size + x;
  }

  function neighbours(i, size) {
    var x = i % size, y = (i - x) / size, out = [];
    if (x > 0) out.push(i - 1);
    if (x < size - 1) out.push(i + 1);
    if (y > 0) out.push(i - size);
    if (y < size - 1) out.push(i + size);
    return out;
  }

  // Trả về các điểm của nhóm chứa i nếu nhóm hết khí, ngược lại null
  function deadGroup(board, i, size) {
    var color = board[i], stack = [i], seen = {}, group = [];
    seen[i] = true;
    while (stack.length) {
      var p = stack.pop();
      group.push(p);
      var nb = neighbours(p, size);
      for (var k = 0; k < nb.length; k++) {
        var q = nb[k];
        if (board[q] === 0) return null;
        if (board[q] === color && !seen[q]) { seen[q] = true; stack.push(q); }
      }
    }
    return group;
  }

  function play(board, mark, i, color, size) {
    board[i] = color;
    var captured = 0, opp = 3 - color, nb = neighbours(i, size);
    for (var k = 0; k < nb.length; k++) {
      if (board[nb[k]] !== opp) continue;
      var g = deadGroup(board, nb[k], size);
      if (g) for (var j = 0; j < g.length; j++) { board[g[j]] = 0; mark[g[j]] = 0; captured++; }
    }
    if (!captured) {                       // tự sát (hiếm, luật một số nơi cho phép)
      var own = deadGroup(board, i, size);
      if (own) for (var m = 0; m < own.length; m++) { board[own[m]] = 0; mark[own[m]] = 0; }
    }
    return captured;
  }

  /* ── Dựng toàn bộ các thế cờ của nhánh chính ───────────── */
  function build(nodes) {
    var rootNode = nodes[0] || {};
    var size = parseInt((rootNode.SZ || ['19'])[0], 10) || 19;
    var board = [], mark = [];
    for (var i = 0; i < size * size; i++) { board.push(0); mark.push(0); }

    var states = [], caps = [0, 0, 0], moveNo = 0, pendingComment = '';

    function setup(nd) {
      ['AB', 'AW', 'AE'].forEach(function (key, ci) {
        (nd[key] || []).forEach(function (v) {
          expand(v, size).forEach(function (p) { board[p] = ci === 2 ? 0 : ci + 1; mark[p] = 0; });
        });
      });
    }
    function snapshot(last, color, comment) {
      states.push({ board: board.slice(), mark: mark.slice(), last: last, color: color,
                    comment: comment, caps: caps.slice(), n: moveNo });
    }

    setup(rootNode);
    snapshot(null, 0, (rootNode.C || [''])[0]);

    for (var k = 1; k < nodes.length; k++) {
      var nd = nodes[k];
      setup(nd);
      var color = nd.B ? 1 : nd.W ? 2 : 0;
      if (!color) {                                   // nút chỉ có setup/bình luận
        var c = (nd.C || [''])[0];
        if (c) states[states.length - 1].comment += (states[states.length - 1].comment ? '\n' : '') + c;
        if (nd.AB || nd.AW || nd.AE) { states[states.length - 1].board = board.slice(); states[states.length - 1].mark = mark.slice(); }
        continue;
      }
      moveNo++;
      var p = pt((color === 1 ? nd.B : nd.W)[0], size);
      if (p !== null) {
        caps[color] += play(board, mark, p, color, size);
        mark[p] = moveNo;
      }
      snapshot(p, color, (nd.C || [''])[0]);
    }
    return { size: size, info: rootNode, states: states };
  }

  // Hỗ trợ dạng nén "aa:cc" trong AB/AW/AE
  function expand(v, size) {
    if (v.indexOf(':') < 0) { var p = pt(v, size); return p === null ? [] : [p]; }
    var a = v.split(':'), x1 = a[0].charCodeAt(0) - 97, y1 = a[0].charCodeAt(1) - 97,
        x2 = a[1].charCodeAt(0) - 97, y2 = a[1].charCodeAt(1) - 97, out = [];
    for (var y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (var x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) out.push(y * size + x);
    return out;
  }

  /* ── Vẽ SVG ────────────────────────────────────────────── */
  var LETTERS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

  function hoshi(size) {
    var e = size >= 13 ? 3 : 2, m = (size - 1) / 2, f = size - 1 - e;
    if (size < 7) return [];
    var pts = [[e, e], [f, e], [e, f], [f, f]];
    if (size % 2 === 1) pts.push([m, m]);
    if (size >= 19) pts.push([m, e], [e, m], [f, m], [m, f]);
    return pts;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render(game, idx, opts) {
    var size = game.size, st = game.states[idx];
    var cell = 30, pad = opts.coords ? 40 : 22, span = cell * (size - 1), full = span + 2 * pad;
    var r = cell * 0.47, o = [];
    var X = function (x) { return pad + x * cell; };

    o.push('<svg viewBox="0 0 ' + full + ' ' + full + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">');
    o.push('<rect class="sgf-bg" x="0" y="0" width="' + full + '" height="' + full + '" rx="3"/>');
    for (var i = 0; i < size; i++) {
      var cls = (i === 0 || i === size - 1) ? 'sgf-edge' : 'sgf-grid';
      o.push('<line class="' + cls + '" x1="' + pad + '" y1="' + X(i) + '" x2="' + (pad + span) + '" y2="' + X(i) + '"/>');
      o.push('<line class="' + cls + '" x1="' + X(i) + '" y1="' + pad + '" x2="' + X(i) + '" y2="' + (pad + span) + '"/>');
    }
    hoshi(size).forEach(function (h) {
      o.push('<circle class="sgf-hoshi" cx="' + X(h[0]) + '" cy="' + X(h[1]) + '" r="3.2"/>');
    });
    if (opts.coords) {
      for (var c = 0; c < size; c++) {
        var L = LETTERS[c], N = size - c;
        o.push('<text class="sgf-coord" x="' + X(c) + '" y="' + (pad - 20) + '">' + L + '</text>');
        o.push('<text class="sgf-coord" x="' + X(c) + '" y="' + (pad + span + 22) + '">' + L + '</text>');
        o.push('<text class="sgf-coord" x="' + (pad - 22) + '" y="' + X(c) + '">' + N + '</text>');
        o.push('<text class="sgf-coord" x="' + (pad + span + 22) + '" y="' + X(c) + '">' + N + '</text>');
      }
    }

    var minNum = opts.numbers ? st.n - opts.numbers + 1 : Infinity;
    for (var p = 0; p < size * size; p++) {
      var col = st.board[p];
      if (!col) continue;
      var x = X(p % size), y = X(Math.floor(p / size));
      o.push('<circle class="' + (col === 1 ? 'stone-b' : 'stone-w') + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>');
      var num = st.mark[p];
      if (num && num >= minNum) {
        var fs = num >= 100 ? 11 : 13;
        o.push('<text class="sgf-num ' + (col === 1 ? 'on-b' : 'on-w') + '" x="' + x + '" y="' + y + '" font-size="' + fs + '">' + num + '</text>');
      } else if (p === st.last) {
        o.push('<circle class="sgf-last ' + (col === 1 ? 'on-b' : 'on-w') + '" cx="' + x + '" cy="' + y + '" r="' + (cell * 0.2) + '"/>');
      }
    }
    o.push('</svg>');
    return o.join('');
  }

  /* ── Thông tin ván cờ ──────────────────────────────────── */
  function result(re) {
    if (!re) return '';
    var m = /^([BW])\+(.*)$/i.exec(re.trim());
    if (!m) return /^(0|draw|jigo)$/i.test(re) ? 'Hoà' : re;
    var who = m[1].toUpperCase() === 'B' ? 'Đen' : 'Trắng', how = m[2];
    if (/^r(esign)?$/i.test(how)) return who + ' thắng, đối thủ xin thua';
    if (/^t(ime)?$/i.test(how)) return who + ' thắng do đối thủ hết giờ';
    if (/^f(orfeit)?$/i.test(how)) return who + ' thắng xử';
    if (/^[\d.]+$/.test(how)) return who + ' thắng ' + how + ' mục';
    return who + ' thắng';
  }

  function infoHTML(info) {
    var g = function (k) { return info[k] ? esc(info[k][0]) : ''; };
    var parts = [];
    if (g('PB') || g('PW')) {
      parts.push('<span class="sgf-player"><span class="stone black" aria-hidden="true"></span>' + (g('PB') || 'Đen') +
                 (g('BR') ? ' <small>' + g('BR') + '</small>' : '') + '<span class="sr">(Đen)</span></span>');
      parts.push('<span class="sgf-player"><span class="stone white" aria-hidden="true"></span>' + (g('PW') || 'Trắng') +
                 (g('WR') ? ' <small>' + g('WR') + '</small>' : '') + '<span class="sr">(Trắng)</span></span>');
    }
    var meta = [];
    if (info.RE) meta.push(esc(result(info.RE[0])));
    if (g('DT')) meta.push(g('DT'));
    if (meta.length) parts.push('<span class="sgf-meta">' + meta.join(' · ') + '</span>');
    return parts.join('');
  }

  /* ── Gắn vào trang ─────────────────────────────────────── */
  function mount(fig) {
    if (fig.getAttribute('data-ready')) return;
    fig.setAttribute('data-ready', '1');
    var view = fig.querySelector('.sgf-view');
    var url = fig.getAttribute('data-sgf');
    var isStatic = fig.hasAttribute('data-static');
    var showComments = fig.getAttribute('data-comments') !== '0';
    var opts = {
      coords: fig.hasAttribute('data-coords'),
      numbers: parseInt(fig.getAttribute('data-numbers') || '0', 10) || 0
    };

    fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (text) {
      var game = build(parse(text));
      var last = game.states.length - 1;
      var want = parseInt(fig.getAttribute('data-move'), 10);
      var idx = isNaN(want) ? (isStatic ? last : 0) : Math.max(0, Math.min(last, want));

      var html = '';
      if (fig.getAttribute('data-info') !== '0') html += '<div class="sgf-info">' + infoHTML(game.info) + '</div>';
      html += '<div class="sgf-board" role="img"></div>';
      if (!isStatic) {
        html += '<input class="sgf-range" type="range" min="0" max="' + last + '" step="1" aria-label="Chọn nước">' +
          '<div class="sgf-controls">' +
          '<button type="button" data-go="first" aria-label="Về đầu ván">«</button>' +
          '<button type="button" data-go="prev" aria-label="Lùi một nước">‹</button>' +
          '<span class="sgf-count" aria-live="polite"></span>' +
          '<button type="button" data-go="next" aria-label="Tiến một nước">›</button>' +
          '<button type="button" data-go="last" aria-label="Đến cuối ván">»</button>' +
          '</div>' +
          '<p class="sgf-comment"></p>';
      }
      view.innerHTML = html;

      var boardEl = view.querySelector('.sgf-board');
      var range = view.querySelector('.sgf-range');
      var count = view.querySelector('.sgf-count');
      var comment = view.querySelector('.sgf-comment');
      var btns = view.querySelectorAll('.sgf-controls button');

      function show(i) {
        idx = Math.max(0, Math.min(last, i));
        var st = game.states[idx];
        boardEl.innerHTML = render(game, idx, opts);
        var label = idx === 0 ? 'Thế cờ ban đầu' : 'Sau nước ' + st.n + (st.last === null ? ' (bỏ lượt)' : '');
        boardEl.setAttribute('aria-label', 'Bàn cờ ' + game.size + '×' + game.size + ', ' + label.toLowerCase());
        if (isStatic) return;
        range.value = idx;
        count.textContent = '手 ' + st.n + ' / ' + game.states[last].n + (idx > 0 && st.last === null ? ' · bỏ lượt' : '');
        var text = showComments ? (st.comment || '') : '';
        comment.textContent = text;
        comment.hidden = !text;
        comment.scrollTop = 0;
        btns[0].disabled = btns[1].disabled = idx === 0;
        btns[2].disabled = btns[3].disabled = idx === last;
      }

      if (!isStatic) {
        fig.setAttribute('tabindex', '0');
        view.querySelector('.sgf-controls').addEventListener('click', function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          var go = b.getAttribute('data-go');
          show(go === 'first' ? 0 : go === 'prev' ? idx - 1 : go === 'next' ? idx + 1 : last);
        });
        range.addEventListener('input', function () { show(parseInt(range.value, 10)); });
        fig.addEventListener('keydown', function (e) {
          if (e.target === range) return;              // thanh trượt tự xử lý phím mũi tên
          var map = { ArrowLeft: idx - 1, ArrowRight: idx + 1, Home: 0, End: last };
          if (e.key in map) { e.preventDefault(); show(map[e.key]); }
        });
      }
      show(idx);
    }).catch(function (err) {
      view.innerHTML = '<p class="sgf-error">Không đọc được ván cờ (' + esc(err.message) + ').</p>';
    });
  }

  function init() {
    var figs = document.querySelectorAll('figure.sgf');
    for (var i = 0; i < figs.length; i++) mount(figs[i]);
  }

  var api = { parse: parse, build: build, render: render, result: result };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  if (root.DvtSgf) return;                             // đã nạp từ include khác
  root.DvtSgf = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : this);
