/* ─────────────────────────────────────────────────────────────
   Đen và Trắng — API bình luận (Cloudflare Worker + D1)

   Công khai (CORS theo ALLOWED_ORIGINS):
     GET  /api/comments?page=/duong-dan/      bình luận đang hiện của một bài
     POST /api/comments                       gửi bình luận (hiện ngay nếu qua bộ lọc)

   Quản trị (Authorization: Bearer <ADMIN_TOKEN>):
     GET  /admin                              trang quản trị
     GET  /api/admin/comments?limit=100       bình luận mới nhất, mọi bài
     POST /api/admin/comments/:id/hide|show|delete
     POST /api/admin/reply  {page, body}      trả lời với tư cách tác giả

   Chống bot: Turnstile, ô bẫy (honeypot), thời gian điền form,
   giới hạn tần suất theo IP (băm), giới hạn link, từ khoá cấm, chặn trùng lặp.
   ───────────────────────────────────────────────────────────── */

const LIMITS = { name: 50, body: 3000, page: 200, minSeconds: 3, maxAgeHours: 24 * 7 };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/comments') return await publicRoute(request, env, ctx, url);
      if (url.pathname === '/admin' || url.pathname === '/admin/') return adminPage(env);
      if (url.pathname.startsWith('/api/admin/')) return await adminRoute(request, env, url);
      if (url.pathname === '/') return text('Đen và Trắng — comments API', 200);
      return text('Not found', 404);
    } catch (err) {
      console.error(err);
      return json({ error: 'Lỗi máy chủ, bạn thử lại sau.' }, 500, corsHeaders(request, env));
    }
  }
};

/* ── Công khai ─────────────────────────────────────────────── */

async function publicRoute(request, env, ctx, url) {
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
  }
  if (request.method === 'GET') {
    const page = cleanPage(url.searchParams.get('page'));
    if (!page) return json({ error: 'Thiếu tham số page.' }, 400, cors);
    const { results } = await env.DB.prepare(
      `SELECT id, name, body, created_at, is_owner FROM comments
       WHERE page = ? AND status = 'visible' ORDER BY created_at ASC LIMIT 500`
    ).bind(page).all();
    return json({ comments: results }, 200, { ...cors, 'Cache-Control': 'no-store' });
  }
  if (request.method === 'POST') {
    if (!cors) return json({ error: 'Nguồn gửi không hợp lệ.' }, 403);
    return await createComment(request, env, ctx, cors);
  }
  return json({ error: 'Phương thức không hỗ trợ.' }, 405, cors);
}

async function createComment(request, env, ctx, cors) {
  let data;
  try { data = await request.json(); } catch { return json({ error: 'Dữ liệu không hợp lệ.' }, 400, cors); }

  const page = cleanPage(data.page);
  const name = clean(data.name).slice(0, LIMITS.name + 1);
  const body = cleanBody(data.body);
  const reject = (msg, status = 400) => json({ error: msg }, status, cors);

  // 1. Ô bẫy: người thật không thấy ô này nên để trống
  if (clean(data.website)) return reject('Không gửi được bình luận.', 403);

  // 2. Thời gian từ lúc mở trang đến lúc gửi (giây, do trình duyệt tính)
  const elapsed = Number(data.elapsed);
  if (!Number.isFinite(elapsed) || elapsed < LIMITS.minSeconds) return reject('Bạn gửi hơi nhanh, đợi vài giây rồi thử lại.', 429);
  if (elapsed > LIMITS.maxAgeHours * 3600) return reject('Trang đã mở quá lâu, bạn tải lại trang rồi gửi nhé.');

  // 3. Kiểm tra nội dung
  if (!page) return reject('Thiếu thông tin bài viết.');
  if (!name) return reject('Bạn chưa nhập tên.');
  if (name.length > LIMITS.name) return reject(`Tên dài tối đa ${LIMITS.name} ký tự.`);
  if (body.length < 2) return reject('Bình luận còn trống.');
  if (body.length > LIMITS.body) return reject(`Bình luận dài tối đa ${LIMITS.body} ký tự.`);
  const links = (body.match(/https?:\/\/|www\./gi) || []).length;
  if (links > Number(env.MAX_LINKS || 2)) return reject('Bình luận có quá nhiều liên kết.');
  const blocked = (env.BLOCKLIST || '').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
  const lower = (name + ' ' + body).toLowerCase();
  if (blocked.some((w) => lower.includes(w))) return reject('Không gửi được bình luận.', 403);

  // 4. Turnstile
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (env.TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET, data.token, ip);
    if (!ok) return reject('Không xác minh được bạn không phải bot. Bạn tải lại trang rồi thử lại nhé.', 403);
  } else {
    console.warn('TURNSTILE_SECRET chưa được đặt — bỏ qua bước xác minh (chỉ nên dùng khi thử cục bộ).');
  }

  // 5. Tần suất theo IP và chặn trùng lặp
  const now = Date.now();
  const ipHash = await sha256((env.IP_SALT || 'dvt') + '|' + ip);
  const recent = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at > ?'
  ).bind(ipHash, now - 10 * 60 * 1000).first();
  if (recent && recent.n >= Number(env.RATE_LIMIT || 3)) return reject('Bạn gửi nhiều bình luận quá, nghỉ vài phút rồi quay lại nhé.', 429);
  const dup = await env.DB.prepare(
    'SELECT id FROM comments WHERE page = ? AND body = ? AND created_at > ? LIMIT 1'
  ).bind(page, body, now - 24 * 3600 * 1000).first();
  if (dup) return reject('Bình luận này đã được gửi rồi.', 409);

  // 6. Lưu và hiện ngay
  const ua = (request.headers.get('User-Agent') || '').slice(0, 300);
  const row = await env.DB.prepare(
    `INSERT INTO comments (page, name, body, created_at, status, is_owner, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, 'visible', 0, ?, ?) RETURNING id, name, body, created_at, is_owner`
  ).bind(page, name, body, now, ipHash, ua).first();

  ctx.waitUntil(notifyTelegram(env, page, name, body));
  return json({ comment: row }, 201, cors);
}

/* ── Quản trị ──────────────────────────────────────────────── */

async function adminRoute(request, env, url) {
  if (!env.ADMIN_TOKEN) return json({ error: 'ADMIN_TOKEN chưa được đặt.' }, 500);
  const auth = request.headers.get('Authorization') || '';
  if (!(await safeEqual(auth, 'Bearer ' + env.ADMIN_TOKEN))) return json({ error: 'Sai mật khẩu.' }, 401);

  if (request.method === 'GET' && url.pathname === '/api/admin/comments') {
    const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10) || 100));
    const { results } = await env.DB.prepare(
      `SELECT id, page, name, body, created_at, status, is_owner FROM comments
       ORDER BY created_at DESC LIMIT ?`
    ).bind(limit).all();
    return json({ comments: results, site: env.SITE_URL || '' });
  }

  const m = url.pathname.match(/^\/api\/admin\/comments\/(\d+)\/(hide|show|delete)$/);
  if (request.method === 'POST' && m) {
    const id = Number(m[1]), action = m[2];
    const stmt = action === 'delete'
      ? env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id)
      : env.DB.prepare('UPDATE comments SET status = ? WHERE id = ?').bind(action === 'hide' ? 'hidden' : 'visible', id);
    const res = await stmt.run();
    return json({ ok: true, changed: res.meta.changes });
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/reply') {
    const data = await request.json().catch(() => ({}));
    const page = cleanPage(data.page), body = cleanBody(data.body);
    if (!page || body.length < 1) return json({ error: 'Thiếu page hoặc nội dung.' }, 400);
    const name = clean(data.name) || clean(env.OWNER_NAME) || 'Tác giả';
    const row = await env.DB.prepare(
      `INSERT INTO comments (page, name, body, created_at, status, is_owner)
       VALUES (?, ?, ?, ?, 'visible', 1) RETURNING id`
    ).bind(page, name.slice(0, LIMITS.name), body.slice(0, LIMITS.body), Date.now()).first();
    return json({ ok: true, id: row.id }, 201);
  }

  return json({ error: 'Not found' }, 404);
}

function adminPage(env) {
  return new Response(ADMIN_HTML.replace('__SITE__', escapeHtml(env.SITE_URL || '')), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'"
    }
  });
}

/* ── Tiện ích ──────────────────────────────────────────────── */

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function json(obj, status = 200, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(headers || {}) }
  });
}
function text(s, status) { return new Response(s, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }

// Bỏ ký tự điều khiển, gộp khoảng trắng
function clean(v) {
  return String(v == null ? '' : v).normalize('NFC').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028\u2029\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
}
// Giữ xuống dòng (tối đa 2 dòng trống liên tiếp)
function cleanBody(v) {
  return String(v == null ? '' : v).normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u200b-\u200f\u2028\u2029\ufeff]/g, '')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function cleanPage(v) {
  const p = String(v == null ? '' : v).trim();
  if (!p.startsWith('/') || p.length > LIMITS.page || /[\s<>"'`\\]/.test(p) || p.includes('//')) return '';
  return p.split('?')[0].split('#')[0];
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function safeEqual(a, b) {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function verifyTurnstile(secret, token, ip) {
  if (!token || typeof token !== 'string' || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const out = await res.json();
    return out.success === true;
  } catch (e) {
    console.error('Turnstile verify failed', e);
    return false;
  }
}

async function notifyTelegram(env, page, name, body) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const site = (env.SITE_URL || '').replace(/\/$/, '');
  const msg = `Bình luận mới — ${name}\n${site}${page}\n\n${body.slice(0, 1000)}`;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: msg, disable_web_page_preview: true })
    });
  } catch (e) { console.error('Telegram notify failed', e); }
}

/* ── Trang quản trị (một file HTML) ────────────────────────── */

const ADMIN_HTML = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Bình luận — quản trị</title>
<style>
:root{--paper:#f6f5f1;--ink:#141414;--muted:#5c5a55;--rule:#e2dfd7;--accent:#8f6a2f}
@media (prefers-color-scheme:dark){:root{--paper:#121212;--ink:#ecebe7;--muted:#a3a19b;--rule:#2a2927;--accent:#d2ae6a}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.6 -apple-system,"Helvetica Neue",Arial,sans-serif}
main{max-width:820px;margin:0 auto;padding:40px 16px}h1{font-weight:400;font-size:24px;margin:0 0 24px}
input,textarea,button{font:inherit;color:inherit}input,textarea{width:100%;padding:10px 12px;border:1px solid var(--rule);background:transparent;border-radius:3px}
button{min-height:36px;padding:6px 12px;border:1px solid var(--rule);background:transparent;border-radius:3px;cursor:pointer}button:hover{border-color:var(--accent);color:var(--accent)}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.muted{color:var(--muted);font-size:13px}
.c{border-top:1px solid var(--rule);padding:16px 0}.c.hidden{opacity:.45}.c .body{white-space:pre-wrap;margin:6px 0 10px}
.c a{color:inherit}.owner{font-size:12px;border:1px solid var(--rule);border-radius:2px;padding:0 6px;margin-left:6px}
#status{min-height:1.6em;margin:12px 0}.reply{margin-top:10px;display:none}.reply.open{display:block}
</style></head><body><main>
<h1>Bình luận</h1>
<form id="login" class="row"><label for="tok" class="muted">Mật khẩu</label><input id="tok" type="password" autocomplete="current-password" style="flex:1;min-width:200px"><button>Vào</button></form>
<p id="status" class="muted" aria-live="polite"></p>
<div id="list"></div>
</main>
<script>
var SITE='__SITE__', tok='';
try{tok=sessionStorage.getItem('dvt-admin')||''}catch(e){}
var $=function(s){return document.querySelector(s)}, st=$('#status');
function api(path,opt){opt=opt||{};opt.headers=Object.assign({'Authorization':'Bearer '+tok},opt.headers||{});
  return fetch(path,opt).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||r.status);return d})})}
function fmt(ms){var d=new Date(ms),p=function(n){return String(n).padStart(2,'0')};return p(d.getDate())+'.'+p(d.getMonth()+1)+'.'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes())}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function load(){st.textContent='Đang tải…';api('/api/admin/comments?limit=200').then(function(d){
  $('#login').style.display='none';st.textContent=d.comments.length+' bình luận gần nhất';var list=$('#list');list.textContent='';
  d.comments.forEach(function(c){var box=el('div','c'+(c.status==='hidden'?' hidden':''));
    var head=el('div','row');var nm=el('strong',null,c.name);head.appendChild(nm);if(c.is_owner)head.appendChild(el('span','owner','tác giả'));
    var meta=el('span','muted',' · '+fmt(c.created_at)+' · ');var a=el('a',null,c.page);a.href=SITE+c.page;a.target='_blank';a.rel='noopener';meta.appendChild(a);
    if(c.status==='hidden')meta.appendChild(document.createTextNode(' · đang ẩn'));head.appendChild(meta);box.appendChild(head);
    box.appendChild(el('div','body',c.body));
    var acts=el('div','row');
    [[c.status==='hidden'?'show':'hide',c.status==='hidden'?'Hiện lại':'Ẩn'],['delete','Xoá hẳn'],['reply','Trả lời']].forEach(function(x){
      var b=el('button',null,x[1]);b.type='button';b.onclick=function(){
        if(x[0]==='reply'){rep.classList.toggle('open');if(rep.classList.contains('open'))ta.focus();return}
        if(x[0]==='delete'&&!confirm('Xoá hẳn bình luận này? Không khôi phục được.'))return;
        api('/api/admin/comments/'+c.id+'/'+x[0],{method:'POST'}).then(load).catch(function(e){st.textContent='Lỗi: '+e.message})};acts.appendChild(b)});
    box.appendChild(acts);
    var rep=el('div','reply'),ta=el('textarea');ta.rows=3;ta.value='@'+c.name+' ';ta.setAttribute('aria-label','Nội dung trả lời');var send=el('button',null,'Gửi trả lời');send.type='button';
    send.onclick=function(){api('/api/admin/reply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page:c.page,body:ta.value})}).then(load).catch(function(e){st.textContent='Lỗi: '+e.message})};
    rep.appendChild(ta);rep.appendChild(send);box.appendChild(rep);list.appendChild(box)})
}).catch(function(e){st.textContent='Lỗi: '+e.message;$('#login').style.display='flex'})}
$('#login').onsubmit=function(ev){ev.preventDefault();tok=$('#tok').value;try{sessionStorage.setItem('dvt-admin',tok)}catch(e){}load()};
if(tok)load();
</script></body></html>`;
