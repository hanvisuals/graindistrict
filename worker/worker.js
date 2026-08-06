// ============================================================================
//  ADIM 1: ANAHTARLARINI ASAGIDAKI IKI SATIRA YAPISTIR
// ============================================================================
//  Tirnak isaretlerinin ARASINA yapistir. Tirnaklari silme.
//
//  Anthropic anahtari:  https://console.anthropic.com/settings/keys
const ANTHROPIC_KEY = 'BURAYA_ANTHROPIC_ANAHTARINI_YAPISTIR';

//  fal.ai anahtari:     https://fal.ai/dashboard/keys
const FAL_KEY = 'BURAYA_FAL_ANAHTARINI_YAPISTIR';

//  Sifre sifirlama e-postasi icin (istege bagli - bos birakirsan sifirlama
//  kapali kalir, gerisi normal calisir):  https://resend.com/api-keys
const RESEND_KEY = '';

//  Sifirlama baglantisinin isaret ettigi site adresi
const APP_URL = 'https://hanvisuals.github.io/graindistrict/';

//  Sifirlama mailinin GONDERICI adresi.
//  Varsayilan (onboarding@resend.dev) Resend'in test adresi: SADECE Resend
//  hesabini actigin e-postaya mail gidebilir. Herkese gidebilmesi icin
//  Resend'de kendi alan adini dogrula, sonra burayi kendi adresinle degistir:
//      const MAIL_FROM = 'GrainDistrict <noreply@senin-alanadin.com>';
const MAIL_FROM = 'GrainDistrict <onboarding@resend.dev>';

// ============================================================================
//  ADIM 2: KV deposu olustur ve bagla (hesap sistemi icin gerekli)
//
//    Cloudflare panelinde:
//      Storage & Databases -> KV -> Create a namespace
//      Isim: graindistrict          (isim onemli degil)
//
//    Sonra bu Worker'da:
//      Settings -> Bindings -> Add -> KV namespace
//      Variable name: GD_KV         <-- BU ISIM AYNEN BOYLE OLMALI
//      KV namespace : az once olusturdugun depo
//
//  ADIM 3: Deploy'a bas.
//  ADIM 4: Worker adresini tarayicida ac, her seyin tamam oldugunu gor.
//  Asagisini degistirmene gerek yok.
// ============================================================================

const PLACEHOLDER = 'BURAYA_';
const TOKEN_DAYS = 90;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({'Content-Type': 'application/json'}, CORS)
  });
}

/* ---------------------------------------------------------------- base64 --- */
function b64u(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function ub64(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
const enc = new TextEncoder();
const dec = new TextDecoder();

/* ------------------------------------------------------------- passwords --- */
// PBKDF2-SHA256. The password itself is never stored - only a salted hash,
// so even full read access to the store doesn't reveal anyone's password.
async function hashPassword(password, saltB64) {
  const salt = saltB64 ? ub64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256'}, key, 256);
  return {salt: b64u(salt), hash: b64u(bits)};
}
// constant-time-ish compare, so a wrong password can't be narrowed down by timing
function sameHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------------------------------------------------------------- tokens --- */
// The signing secret is generated once, on first use, and kept in KV - so
// there's no extra value to configure by hand and no secret sitting in this file.
async function getSecret(store) {
  let s = await store.get('_secret');
  if (!s) {
    s = b64u(crypto.getRandomValues(new Uint8Array(32)));
    await store.put('_secret', s);
  }
  return s;
}
async function hmacKey(store, usage) {
  const secret = await getSecret(store);
  return crypto.subtle.importKey('raw', enc.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, [usage]);
}
async function makeToken(store, payload) {
  const key = await hmacKey(store, 'sign');
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return body + '.' + b64u(sig);
}
async function readToken(store, token) {
  if (!token || token.indexOf('.') < 0) return null;
  const parts = token.split('.');
  try {
    const key = await hmacKey(store, 'verify');
    const ok = await crypto.subtle.verify('HMAC', key, ub64(parts[1]), enc.encode(parts[0]));
    if (!ok) return null;
    const p = JSON.parse(dec.decode(ub64(parts[0])));
    if (!p.exp || Date.now() > p.exp) return null;
    return p;
  } catch (e) { return null; }
}
async function requireUser(request, store) {
  const auth = request.headers.get('Authorization') || '';
  const p = await readToken(store, auth.replace(/^Bearer\s+/i, ''));
  if (!p) return null;
  // a password reset bumps pv, which retires every session issued before it -
  // otherwise resetting your password would leave a stolen session logged in
  const raw = await store.get('user:' + p.email);
  if (!raw) return null;
  const u = JSON.parse(raw);
  if ((u.pv || 1) !== (p.pv || 1)) return null;
  return p;
}

/* ------------------------------------------------------------- depolama --- */
// The binding can be either a KV namespace or a D1 database - whichever is
// already attached. D1 has .prepare() and no .get(), which is what produced
// "env.GD_KV.get is not a function". Both are wrapped in the same tiny
// key/value interface here so nothing below has to care which one it is.
let d1Ready = null;

function makeStore(binding) {
  if (!binding) return null;

  // ---- KV namespace ----
  if (typeof binding.get === 'function' && typeof binding.put === 'function') {
    return {
      kind: 'KV',
      get: (k) => binding.get(k),
      put: (k, v, meta) => binding.put(k, v, meta ? {metadata: meta} : undefined),
      del: (k) => binding.delete(k),
      list: async (prefix) => {
        const out = [];
        let cursor;
        do {
          const r = await binding.list({prefix: prefix, cursor: cursor});
          r.keys.forEach(x => out.push({name: x.name, metadata: x.metadata || {}}));
          cursor = r.list_complete ? null : r.cursor;
        } while (cursor);
        return out;
      }
    };
  }

  // ---- D1 database ----
  if (typeof binding.prepare === 'function') {
    // the table is created on first use, so there is no SQL to run by hand
    const init = () => {
      if (!d1Ready) {
        d1Ready = binding.prepare(
          'CREATE TABLE IF NOT EXISTS gd_store (k TEXT PRIMARY KEY, v TEXT NOT NULL, meta TEXT)'
        ).run().catch(e => { d1Ready = null; throw e; });
      }
      return d1Ready;
    };
    return {
      kind: 'D1',
      async get(k) {
        await init();
        const row = await binding.prepare('SELECT v FROM gd_store WHERE k = ?').bind(k).first();
        return row ? row.v : null;
      },
      async put(k, v, meta) {
        await init();
        await binding.prepare(
          'INSERT INTO gd_store (k, v, meta) VALUES (?, ?, ?) ' +
          'ON CONFLICT(k) DO UPDATE SET v = excluded.v, meta = excluded.meta'
        ).bind(k, v, meta ? JSON.stringify(meta) : null).run();
      },
      async del(k) {
        await init();
        await binding.prepare('DELETE FROM gd_store WHERE k = ?').bind(k).run();
      },
      async list(prefix) {
        await init();
        // a range scan rather than LIKE, so characters like _ and % in a key
        // can never be read as wildcards
        const r = await binding.prepare('SELECT k, meta FROM gd_store WHERE k >= ? AND k < ?')
          .bind(prefix, prefix + '\uffff').all();
        return (r.results || []).map(row => {
          let m = {};
          try { m = JSON.parse(row.meta) || {}; } catch (e) {}
          return {name: row.k, metadata: m};
        });
      }
    };
  }

  return null;
}

/* ------------------------------------------------------------------ misc --- */
function normEmail(e) { return String(e || '').trim().toLowerCase(); }
function uid() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function pid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function keyStatus(key, label) {
  if (!key || key.indexOf(PLACEHOLDER) === 0) return label + ': AYARLANMAMIS - koddaki satira yapistirman lazim';
  if (key !== key.trim()) return label + ': HATALI - basinda/sonunda bosluk var';
  return label + ': tamam (' + key.length + ' karakter)';
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, {headers: CORS});

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    const anthropicKey = ((env && env.ANTHROPIC_KEY) || ANTHROPIC_KEY || '').trim();
    const falKey = ((env && env.FAL_KEY) || FAL_KEY || '').trim();
    // Accepts either a KV namespace or a D1 database, whichever is bound.
    // A plain text variable is truthy but has neither interface, so it is
    // caught here with a message saying what to fix rather than blowing up
    // mid-signup.
    const binding = env && env.GD_KV;
    const store = makeStore(binding);
    const hasKV = !!store;

    /* ---------------------------------------------------- durum sayfasi --- */
    if (request.method === 'GET' && path === '/') {
      const lines = [
        'Worker calisiyor.',
        '',
        keyStatus(anthropicKey, 'Anthropic anahtari'),
        keyStatus(falKey, 'fal.ai anahtari'),
        RESEND_KEY ? 'Sifre sifirlama e-postasi: acik' : 'Sifre sifirlama e-postasi: kapali (istege bagli - RESEND_KEY bos)',
        hasKV ? ('Hesap deposu (GD_KV): tamam - ' + store.kind + ' kullaniliyor')
              : binding ? 'Hesap deposu (GD_KV): YANLIS TURDE - KV namespace veya D1 database olmali. Simdi duz metin degisken olarak eklenmis.'
                        : 'Hesap deposu (GD_KV): BAGLI DEGIL - Settings > Bindings > Add > KV namespace (veya D1 database), degisken adi GD_KV olmali',
        '',
        (anthropicKey.indexOf(PLACEHOLDER) !== 0 && hasKV)
          ? 'Her sey hazir. Siteye donup giris yapabilirsin.'
          : 'Yukarida eksik yazan varsa once onu tamamla.'
      ];
      return new Response(lines.join('\n') + '\n', {
        headers: Object.assign({'Content-Type': 'text/plain; charset=utf-8'}, CORS)
      });
    }

    /* ============================ HESAP + PROJE ============================ */
    if (path.indexOf('/api/') === 0) {
      if (!hasKV) return json({error: binding
        ? 'GD_KV duz metin degisken olarak eklenmis. Cloudflare > Worker > Settings > Bindings: onu sil, "KV namespace" veya "D1 database" turunde yeniden ekle.'
        : 'Hesap deposu bagli degil (GD_KV). Cloudflare > Worker > Settings > Bindings > Add > KV namespace (veya D1 database), degisken adi GD_KV olmali.'}, 500);

      try {
        /* ---- kayit ol ---- */
        if (request.method === 'POST' && path === '/api/signup') {
          const b = await request.json();
          const email = normEmail(b.email);
          const pass = String(b.password || '');
          if (!email || email.indexOf('@') < 0) return json({error: 'Gecerli bir e-posta gir.'}, 400);
          if (pass.length < 6) return json({error: 'Sifre en az 6 karakter olmali.'}, 400);

          const existing = await store.get('user:' + email);
          if (existing) return json({error: 'Bu e-posta ile zaten bir hesap var. Giris yap.'}, 409);

          const {salt, hash} = await hashPassword(pass);
          const user = {id: uid(), email: email, salt: salt, hash: hash, pv: 1, created_at: Date.now()};
          await store.put('user:' + email, JSON.stringify(user));
          const token = await makeToken(store, {uid: user.id, email: email, pv: user.pv, exp: Date.now() + TOKEN_DAYS * 864e5});
          return json({token: token, email: email});
        }

        /* ---- giris yap ---- */
        if (request.method === 'POST' && path === '/api/login') {
          const b = await request.json();
          const email = normEmail(b.email);
          const pass = String(b.password || '');
          const raw = await store.get('user:' + email);
          // same message whether the account is missing or the password is
          // wrong, so this can't be used to find out who has an account
          if (!raw) return json({error: 'E-posta veya sifre hatali.'}, 401);
          const user = JSON.parse(raw);
          const {hash} = await hashPassword(pass, user.salt);
          if (!sameHash(hash, user.hash)) return json({error: 'E-posta veya sifre hatali.'}, 401);
          const token = await makeToken(store, {uid: user.id, email: email, pv: user.pv || 1, exp: Date.now() + TOKEN_DAYS * 864e5});
          return json({token: token, email: email});
        }

        /* ---- sifremi unuttum ---- */
        if (request.method === 'POST' && path === '/api/forgot') {
          const b = await request.json();
          const email = normEmail(b.email);
          // always the same answer, whether or not that account exists, so
          // this can't be used to find out who has one
          const vague = json({ok: true});
          // this check has to come BEFORE the account lookup: answering 503 for
          // real accounts and 200 for made-up ones would tell anyone asking
          // exactly which addresses have accounts here
          if (!RESEND_KEY) return json({error: 'Sifre sifirlama bu sunucuda ayarlanmamis (RESEND_KEY).'}, 503);
          if (!email || email.indexOf('@') < 0) return vague;
          const raw = await store.get('user:' + email);
          if (!raw) return vague;

          const tok = b64u(crypto.getRandomValues(new Uint8Array(32)));
          await store.put('reset:' + tok, JSON.stringify({email: email, exp: Date.now() + 3600e3}));
          const link = APP_URL + (APP_URL.indexOf('?') < 0 ? '?' : '&') + 'reset=' + tok;
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json'},
            body: JSON.stringify({
              from: MAIL_FROM,
              to: [email],
              subject: 'Reset your GrainDistrict password',
              html: '<p>Use the link below to set a new password. It works once and expires in an hour.</p>'
                  + '<p><a href="' + link + '">Set a new password</a></p>'
                  + '<p style="color:#888;font-size:12px">If you did not ask for this, ignore this email - nothing has changed.</p>'
            })
          });
          if (!res.ok) {
            const detail = (await res.text()).slice(0, 300);
            // Resend refuses any recipient other than the account owner until a
            // sending domain is verified - say so plainly instead of leaving a
            // bare 502 to guess at
            const hint = /testing emails|own email address|verify a domain/i.test(detail)
              ? ' — Resend henuz dogrulanmis alan adin olmadigi icin sadece kendi adresine mail gonderiyor. Resend > Domains bolumunden alan adini dogrulayip MAIL_FROM satirini degistir.'
              : '';
            return json({error: 'E-posta gonderilemedi: ' + detail + hint}, 502);
          }
          return vague;
        }

        /* ---- yeni sifre belirle ---- */
        if (request.method === 'POST' && path === '/api/reset') {
          const b = await request.json();
          const tok = String(b.token || '');
          const pass = String(b.password || '');
          if (pass.length < 6) return json({error: 'Sifre en az 6 karakter olmali.'}, 400);
          const rawTok = await store.get('reset:' + tok);
          if (!rawTok) return json({error: 'Bu baglanti gecersiz veya kullanilmis.'}, 400);
          const rec = JSON.parse(rawTok);
          if (!rec.exp || Date.now() > rec.exp) {
            await store.del('reset:' + tok);
            return json({error: 'Bu baglantinin suresi dolmus. Yeniden sifirlama iste.'}, 400);
          }
          const rawUser = await store.get('user:' + rec.email);
          if (!rawUser) { await store.del('reset:' + tok); return json({error: 'Hesap bulunamadi.'}, 404); }
          const user = JSON.parse(rawUser);
          const fresh = await hashPassword(pass);
          user.salt = fresh.salt; user.hash = fresh.hash;
          user.pv = (user.pv || 1) + 1;      // retires every existing session
          await store.put('user:' + rec.email, JSON.stringify(user));
          await store.del('reset:' + tok);   // single use
          const token = await makeToken(store, {uid: user.id, email: rec.email, pv: user.pv, exp: Date.now() + TOKEN_DAYS * 864e5});
          return json({token: token, email: rec.email});
        }

        /* ---- buradan asagisi giris ister ---- */
        const me = await requireUser(request, store);
        if (!me) return json({error: 'Oturum gecersiz veya suresi dolmus. Tekrar giris yap.'}, 401);

        const prefix = 'proj:' + me.uid + ':';

        /* ---- proje listesi ---- */
        if (request.method === 'GET' && path === '/api/projects') {
          // name + updated_at live in each key's metadata, so listing never has
          // to read (and ship back) every full board
          const rows = await store.list(prefix);
          const out = rows.map(k => {
            const m = k.metadata || {};
            return {id: k.name.slice(prefix.length), name: m.name || 'Untitled', updated_at: m.updated_at || 0, created_at: m.created_at || 0};
          });
          out.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
          return json({projects: out});
        }

        /* ---- tek proje ---- */
        if (request.method === 'GET' && path.indexOf('/api/projects/') === 0) {
          const id = path.slice('/api/projects/'.length);
          const raw = await store.get(prefix + id);
          if (!raw) return json({error: 'Proje bulunamadi.'}, 404);
          return json({project: JSON.parse(raw)});
        }

        /* ---- kaydet ---- */
        if (request.method === 'PUT' && path.indexOf('/api/projects/') === 0) {
          let id = path.slice('/api/projects/'.length);
          if (!id || id === 'new') id = pid();
          const b = await request.json();
          const now = Date.now();
          const rec = {
            id: id,
            name: String(b.name || 'Untitled').slice(0, 120),
            nameManual: !!b.nameManual,
            data: b.data || {},
            created_at: b.created_at || now,
            updated_at: now
          };
          await store.put(prefix + id, JSON.stringify(rec),
            {name: rec.name, updated_at: rec.updated_at, created_at: rec.created_at});
          return json({id: id, updated_at: rec.updated_at});
        }

        /* ---- sil ---- */
        if (request.method === 'DELETE' && path.indexOf('/api/projects/') === 0) {
          const id = path.slice('/api/projects/'.length);
          await store.del(prefix + id);
          return json({ok: true});
        }

        return json({error: 'Bilinmeyen istek.'}, 404);
      } catch (err) {
        return json({error: err.message || String(err)}, 500);
      }
    }

    /* ================================ AI =================================== */
    if (request.method !== 'POST') return new Response('Method not allowed', {status: 405, headers: CORS});

    try {
      const body = await request.json();

      if (body.falPrompt) {
        if (!falKey || falKey.indexOf(PLACEHOLDER) === 0) {
          return json({error: 'fal.ai anahtari Worker koduna girilmemis (FAL_KEY).'}, 500);
        }
        const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
          method: 'POST',
          headers: {'Authorization': 'Key ' + falKey, 'Content-Type': 'application/json'},
          body: JSON.stringify({prompt: body.falPrompt, image_size: 'landscape_4_3', num_images: 1, num_inference_steps: 2, seed: body.falSeed || 42, enable_safety_checker: false})
        });
        const falData = await falRes.json();
        if (!falRes.ok) return json({error: falData.detail || falData.error || 'fal error'}, falRes.status);
        return json({imageUrl: (falData.images && falData.images[0] && falData.images[0].url) || null});
      }

      if (!anthropicKey || anthropicKey.indexOf(PLACEHOLDER) === 0) {
        return json({error: 'Anthropic anahtari Worker koduna girilmemis (ANTHROPIC_KEY).'}, 500);
      }

      const {system, user} = body;

      // Uzun bir plan uretmek 100 saniyeyi asabiliyor. Cloudflare o sureye kadar
      // yanit vermeyen istegi kesip "error code: 524" donduruyordu. Stream ile
      // baytlar hemen akmaya basladigi icin o sinir devreye girmiyor.
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          system,
          messages: [{role: 'user', content: user}],
          stream: true
        })
      });

      if (!upstream.ok) {
        const errText = await upstream.text();
        return json({error: errText}, upstream.status);
      }

      const {readable, writable} = new TransformStream();
      (async () => {
        const writer = writable.getWriter();
        const reader = upstream.body.getReader();
        let buf = '';
        try {
          while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            buf += dec.decode(value, {stream: true});
            let nl;
            while ((nl = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;
              try {
                const ev = JSON.parse(payload);
                if (ev.type === 'content_block_delta' && ev.delta && typeof ev.delta.text === 'string') {
                  await writer.write(enc.encode(ev.delta.text));
                }
              } catch (e) { /* yarim satir - atla */ }
            }
          }
        } catch (e) {
          // uretim ortasinda koptu: eldekiyle kapat
        } finally {
          try { await writer.close(); } catch (e) {}
        }
      })();

      return new Response(readable, {
        headers: Object.assign({'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache'}, CORS)
      });

    } catch (err) {
      return json({error: err.message}, 500);
    }
  }
};
