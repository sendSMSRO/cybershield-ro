/**
 * Cloudflare Pages Function — Secure Contact Form API
 * Location: functions/api/contact.js
 *
 * Security features:
 * - Cloudflare Turnstile CAPTCHA verification
 * - Server-side input sanitization (defense in depth)
 * - Rate limiting per IP via KV Store
 * - Parameterized D1 queries (SQL injection prevention)
 * - CORS restricted to cybershield.ro
 * - Input length limits enforced
 * - Email format validation
 */

const RATE_LIMIT = 5;
const RATE_WINDOW = 300; // 5 minutes in seconds

function sanitize(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim()
    .slice(0, 5000);
}

function validEmail(e) {
  return (
    typeof e === "string" &&
    e.length <= 254 &&
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(e)
  );
}

const ALLOWED_ORIGINS = [
  "https://cybershield.ro",
  "https://www.cybershield.ro",
];

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(request);

  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    // ── Rate Limiting ──
    if (env.KV_STORE) {
      const key = `rl:${ip}`;
      const current = parseInt((await env.KV_STORE.get(key)) || "0");
      if (current >= RATE_LIMIT) {
        return new Response(
          JSON.stringify({ error: "rate_limit", message: "Too many requests" }),
          { status: 429, headers }
        );
      }
      await env.KV_STORE.put(key, String(current + 1), { expirationTtl: RATE_WINDOW });
    }

    // ── Parse Request ──
    const body = await request.json();

    // ── Verify Turnstile CAPTCHA ──
    const turnstileResponse = body["cf-turnstile-response"];
    if (!turnstileResponse) {
      return new Response(
        JSON.stringify({ error: "captcha_missing" }),
        { status: 400, headers }
      );
    }

    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileResponse,
          remoteip: ip,
        }),
      }
    );
    const verifyResult = await verifyRes.json();
    if (!verifyResult.success) {
      return new Response(
        JSON.stringify({ error: "captcha_failed" }),
        { status: 403, headers }
      );
    }

    // ── Sanitize & Validate ──
    const name = sanitize(body.name).slice(0, 100);
    const email = sanitize(body.email).slice(0, 254);
    const company = sanitize(body.company || "").slice(0, 150);
    const service = sanitize(body.service || "").slice(0, 200);
    const message = sanitize(body.message).slice(0, 2000);

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "missing_fields" }),
        { status: 400, headers }
      );
    }
    if (!validEmail(email)) {
      return new Response(
        JSON.stringify({ error: "invalid_email" }),
        { status: 400, headers }
      );
    }

    // ── Store in D1 (parameterized — SQL injection safe) ──
    if (env.DB) {
      await env.DB.prepare(
        `INSERT INTO contact_submissions (name, email, company, service, message, ip, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      )
        .bind(name, email, company, service, message, ip)
        .run();
    }

    // ── Send Email via Resend ──
    if (env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "CyberShield Contact <noreply@cybershield.ro>",
          to: ["contact@cybershield.ro"],
          subject: `[Contact] ${service || "General"} — ${name}`,
          html: `<h2>New Contact Submission</h2>
            <table style="border-collapse:collapse;width:100%;max-width:600px">
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;width:120px">Name</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Company</td><td style="padding:8px;border:1px solid #ddd">${company || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Service</td><td style="padding:8px;border:1px solid #ddd">${service || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Message</td><td style="padding:8px;border:1px solid #ddd">${message}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">IP</td><td style="padding:8px;border:1px solid #ddd">${ip}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Time (UTC)</td><td style="padding:8px;border:1px solid #ddd">${new Date().toISOString()}</td></tr>
            </table>`,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("Contact API error:", err);
    return new Response(
      JSON.stringify({ error: "server_error" }),
      { status: 500, headers }
    );
  }
}

// CORS preflight handler
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://cybershield.ro",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
