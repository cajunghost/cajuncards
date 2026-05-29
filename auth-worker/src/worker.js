/**
 * Cajun Cards auth worker
 *
 * Endpoints
 *   POST /api/auth/login            — verify credentials, return JWT
 *   POST /api/auth/change-password  — swap password (requires valid JWT)
 *   OPTIONS *                       — CORS preflight
 *
 * Required Worker secrets (set via `wrangler secret put`):
 *   ADMIN_USERNAME        initial admin username
 *   ADMIN_PASSWORD_HASH   SHA-256 hex of the initial admin password
 *   JWT_SECRET            ≥32 random characters for HMAC-SHA-256 signing
 *
 * Required KV namespace:
 *   AUTH_KV               stores rate-limit counters + password overrides
 */

const MAX_ATTEMPTS   = 5;
const WINDOW_SECS    = 15 * 60;   // 15 min lockout window
const TOKEN_TTL_SECS = 8 * 3600;  // 8-hour session

export default {
  async fetch(request, env) {
    const origin  = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
    const cors    = allowed.includes(origin)
      ? {
          "Access-Control-Allow-Origin":  origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age":       "86400",
          "Vary":                         "Origin",
        }
      : {};

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const path = new URL(request.url).pathname;

    if (path === "/api/auth/login" && request.method === "POST") {
      return handleLogin(request, env, cors);
    }
    if (path === "/api/auth/change-password" && request.method === "POST") {
      return handleChangePassword(request, env, cors);
    }

    return json({ error: "Not found" }, 404, cors);
  },
};

/* ── Login ──────────────────────────────────────────────── */

async function handleLogin(request, env, cors) {
  const ip  = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `rl:${ip}`;

  // Check existing rate-limit record
  const record = await getRecord(env.AUTH_KV, key);
  if (record.lockedUntil > Date.now()) {
    const mins = Math.ceil((record.lockedUntil - Date.now()) / 60_000);
    return json(
      { error: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.` },
      429,
      cors,
    );
  }

  // Parse body
  let body;
  try { body = await request.json(); } catch {
    return json({ error: "Request body must be JSON." }, 400, cors);
  }
  const { username = "", password = "" } = body;
  if (!username || !password) {
    return json({ error: "Username and password are required." }, 400, cors);
  }

  // Resolve current credentials (KV overrides env defaults after a password change)
  const expectedUser = (await env.AUTH_KV.get("admin:username")) ?? env.ADMIN_USERNAME ?? "";
  const expectedHash = (await env.AUTH_KV.get("admin:passwordHash")) ?? env.ADMIN_PASSWORD_HASH ?? "";
  const inputHash    = await sha256(password);

  const ok =
    username.toLowerCase() === expectedUser.toLowerCase() &&
    inputHash === expectedHash;

  if (!ok) {
    const newCount      = (record.count || 0) + 1;
    const lockedUntil   = newCount >= MAX_ATTEMPTS ? Date.now() + WINDOW_SECS * 1_000 : 0;
    await env.AUTH_KV.put(key, JSON.stringify({ count: newCount, lockedUntil }), {
      expirationTtl: WINDOW_SECS,
    });

    const remaining = MAX_ATTEMPTS - newCount;
    const msg = remaining > 0
      ? `Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before lockout.`
      : `Too many failed attempts. Try again in ${WINDOW_SECS / 60} minutes.`;
    return json({ error: msg }, 401, cors);
  }

  // Success — clear counter, issue token
  await env.AUTH_KV.delete(key);
  const token = await createJWT({ sub: username }, TOKEN_TTL_SECS, env.JWT_SECRET);
  return json({ token }, 200, cors);
}

/* ── Change password ────────────────────────────────────── */

async function handleChangePassword(request, env, cors) {
  const payload = await requireAuth(request, env.JWT_SECRET);
  if (!payload) return json({ error: "Unauthorized — valid session required." }, 401, cors);

  let body;
  try { body = await request.json(); } catch {
    return json({ error: "Request body must be JSON." }, 400, cors);
  }

  const { currentPassword = "", newPassword = "" } = body;
  if (!currentPassword || !newPassword) {
    return json({ error: "currentPassword and newPassword are required." }, 400, cors);
  }
  if (newPassword.length < 12) {
    return json({ error: "New password must be at least 12 characters." }, 400, cors);
  }

  const expectedHash = (await env.AUTH_KV.get("admin:passwordHash")) ?? env.ADMIN_PASSWORD_HASH ?? "";
  if (await sha256(currentPassword) !== expectedHash) {
    return json({ error: "Current password is incorrect." }, 403, cors);
  }

  // Persist new hash to KV (survives redeployments)
  await env.AUTH_KV.put("admin:passwordHash", await sha256(newPassword));
  return json({ ok: true }, 200, cors);
}

/* ── JWT helpers ────────────────────────────────────────── */

function b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s) {
  return Uint8Array.from(
    atob(s.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
}

async function hmacKey(secret, usage) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

async function createJWT(payload, ttlSecs, secret) {
  const header  = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body    = b64url(new TextEncoder().encode(
    JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSecs }),
  ));
  const data    = `${header}.${body}`;
  const key     = await hmacKey(secret, "sign");
  const sigBuf  = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${b64url(sigBuf)}`;
}

async function verifyJWT(token, secret) {
  try {
    const parts = (token || "").split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const key   = await hmacKey(secret, "verify");
    const valid = await crypto.subtle.verify(
      "HMAC", key,
      b64urlDecode(sig),
      new TextEncoder().encode(`${header}.${body}`),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

async function requireAuth(request, jwtSecret) {
  const auth  = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return verifyJWT(token, jwtSecret);
}

/* ── Misc helpers ───────────────────────────────────────── */

function json(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

async function sha256(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getRecord(kv, key) {
  try {
    const raw = await kv.get(key);
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}
