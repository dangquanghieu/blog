/* ─────────────────────────────────────────────────────────────
   Đen và Trắng — khung bình luận
   Đọc/gửi bình luận qua API Cloudflare Worker (comments-worker/).
   Nội dung người đọc chỉ được đưa vào trang bằng textContent,
   không bao giờ qua innerHTML.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var NAME_KEY = 'dvt-cm-name';

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(ms) {
    var d = new Date(ms);
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
           ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Văn bản thuần → đoạn văn, xuống dòng, link (an toàn: chỉ tạo node)
  var URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;
  function appendText(parent, text) {
    var last = 0, m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = el('a', null, m[0]);
      a.href = m[0];
      a.rel = 'nofollow ugc noopener';
      parent.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function renderBody(body) {
    var wrap = el('div', 'cm-body');
    body.split(/\n{2,}/).forEach(function (para) {
      var p = el('p');
      para.split('\n').forEach(function (line, i) {
        if (i) p.appendChild(document.createElement('br'));
        appendText(p, line);
      });
      wrap.appendChild(p);
    });
    return wrap;
  }
  function renderItem(c, fresh) {
    var li = el('li', 'cm-item' + (c.is_owner ? ' owner' : '') + (fresh ? ' fresh' : ''));
    li.id = 'bl-' + c.id;
    var head = el('div', 'cm-head');
    var dot = el('span', 'stone ' + (c.is_owner ? 'black' : 'white'));
    dot.setAttribute('aria-hidden', 'true');
    head.appendChild(dot);
    head.appendChild(el('strong', 'cm-name', c.name));
    if (c.is_owner) head.appendChild(el('span', 'cm-badge', 'tác giả'));
    var t = el('time', 'cm-time', fmt(c.created_at));
    t.dateTime = new Date(c.created_at).toISOString();
    head.appendChild(t);
    li.appendChild(head);
    li.appendChild(renderBody(c.body));
    return li;
  }

  function mount(box) {
    var api = (box.getAttribute('data-api') || '').replace(/\/$/, '');
    var page = box.getAttribute('data-page');
    var sitekey = box.getAttribute('data-sitekey');
    if (!api || !page) return;

    var list = box.querySelector('.cm-list');
    var empty = box.querySelector('.cm-empty');
    var count = box.querySelector('.cm-count');
    var form = box.querySelector('.cm-form');
    var status = box.querySelector('.cm-status');
    var button = form.querySelector('button');
    var nameInput = form.querySelector('#cm-name');
    var bodyInput = form.querySelector('#cm-body');
    var hpInput = form.querySelector('#cm-website');
    var opened = Date.now();
    var n = 0;

    try { nameInput.value = localStorage.getItem(NAME_KEY) || ''; } catch (e) {}

    function setCount() {
      count.textContent = n ? ' · ' + n : '';
      empty.hidden = n > 0;
    }
    function say(msg, isError) {
      status.textContent = msg || '';
      status.classList.toggle('error', !!isError);
    }

    // ── Tải bình luận ───────────────────────────────────────
    fetch(api + '/api/comments?page=' + encodeURIComponent(page))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        (d.comments || []).forEach(function (c) { list.appendChild(renderItem(c)); });
        n = (d.comments || []).length;
        setCount();
        if (location.hash.indexOf('#bl-') === 0) {
          var target = document.getElementById(location.hash.slice(1));
          if (target) target.scrollIntoView();
        }
      })
      .catch(function () { empty.hidden = false; empty.textContent = 'Không tải được bình luận.'; });

    // ── Turnstile (nạp khi khung bình luận sắp hiện ra) ─────
    var token = '', widgetId = null, tsLoading = false;
    function theme() {
      var t = document.documentElement.getAttribute('data-theme');
      return t === 'dark' || t === 'light' ? t : 'auto';
    }
    function renderTurnstile() {
      if (widgetId !== null || !window.turnstile) return;
      widgetId = window.turnstile.render(box.querySelector('.cm-turnstile'), {
        sitekey: sitekey,
        theme: theme(),
        language: 'vi',
        appearance: 'interaction-only',
        callback: function (t) { token = t; },
        'expired-callback': function () { token = ''; },
        'error-callback': function () { token = ''; }
      });
    }
    function loadTurnstile() {
      if (!sitekey || tsLoading) return;
      tsLoading = true;
      window.dvtTurnstileReady = renderTurnstile;
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=dvtTurnstileReady';
      s.async = true;
      document.head.appendChild(s);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { loadTurnstile(); io.disconnect(); }
      }, { rootMargin: '600px 0px' });
      io.observe(box);
    } else {
      loadTurnstile();
    }
    form.addEventListener('focusin', loadTurnstile);

    function waitToken(ms) {
      return new Promise(function (resolve) {
        var start = Date.now();
        (function poll() {
          if (!sitekey || token) return resolve(token);
          if (Date.now() - start > ms) return resolve('');
          setTimeout(poll, 200);
        })();
      });
    }
    function resetTurnstile() {
      token = '';
      if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
    }

    // ── Gửi ─────────────────────────────────────────────────
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = nameInput.value.trim(), body = bodyInput.value.trim();
      if (!name) { say('Bạn chưa nhập tên.', true); nameInput.focus(); return; }
      if (body.length < 2) { say('Bình luận còn trống.', true); bodyInput.focus(); return; }

      button.disabled = true;
      say(sitekey && !token ? 'Đang xác minh…' : 'Đang gửi…');
      waitToken(15000).then(function (tok) {
        if (sitekey && !tok) throw new Error('Không xác minh được, bạn thử gửi lại nhé.');
        say('Đang gửi…');
        return fetch(api + '/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: page, name: name, body: body, website: hpInput.value, elapsed: Math.round((Date.now() - opened) / 1000), token: tok })
        });
      }).then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d.error || 'Không gửi được bình luận.');
          return d;
        });
      }).then(function (d) {
        var li = renderItem(d.comment, true);
        list.appendChild(li);
        n++; setCount();
        bodyInput.value = '';
        try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
        say('Đã gửi.');
      }).catch(function (err) {
        say(err.message || 'Không gửi được bình luận.', true);
      }).then(function () {
        button.disabled = false;
        resetTurnstile();
      });
    });
  }

  function init() {
    var boxes = document.querySelectorAll('section.cm');
    for (var i = 0; i < boxes.length; i++) mount(boxes[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
