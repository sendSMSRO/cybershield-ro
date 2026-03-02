const RATE_LIMIT = 5;
const RATE_WINDOW = 300;

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

    const body = await request.json();

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

    if (env.DB) {
      await env.DB.prepare(
        `INSERT INTO contact_submissions (name, email, company, service, message, ip, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      )
        .bind(name, email, company, service, message, ip)
        .run();
    }

    if (env.BREVO_API_KEY) {
      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: "CyberShield Contact", email: "noreply@cybershield.ro" },
          to: [{ email: "lb@cybershield.ro", name: "Liviu Baltoi" }],
          replyTo: { email: email, name: name },
          subject: `[Contact] ${service || "General"} — ${name}`,
          htmlContent: `<h2>Mesaj nou din formularul de contact</h2>
            <table style="border-collapse:collapse;width:100%;max-width:600px">
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;width:120px">Nume</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Companie</td><td style="padding:8px;border:1px solid #ddd">${company || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Serviciu</td><td style="padding:8px;border:1px solid #ddd">${service || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Mesaj</td><td style="padding:8px;border:1px solid #ddd">${message}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">IP</td><td style="padding:8px;border:1px solid #ddd">${ip}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Data (UTC)</td><td style="padding:8px;border:1px solid #ddd">${new Date().toISOString()}</td></tr>
            </table>`,
        }),
      });
      const brevoBody = await brevoRes.json();
      console.log("Brevo status:", brevoRes.status, JSON.stringify(brevoBody));
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