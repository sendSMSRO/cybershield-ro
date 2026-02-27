# 🛡️ BASE64 CYBERSHIELD — Cloudflare Pages Deployment Guide

## Cuprins
1. [Arhitectura](#1-arhitectura)
2. [Cerințe preliminare](#2-cerințe-preliminare)
3. [Structura proiectului](#3-structura-proiectului)
4. [Setup pas cu pas](#4-setup-pas-cu-pas)
5. [Cloudflare Turnstile (CAPTCHA)](#5-cloudflare-turnstile-captcha)
6. [Cloudflare Workers (API Contact)](#6-cloudflare-workers-api-contact)
7. [DNS & Domeniu](#7-dns--domeniu)
8. [Security Headers](#8-security-headers)
9. [Email Integration](#9-email-integration)
10. [Monitorizare & Mentenanță](#10-monitorizare--mentenanță)
11. [Costuri](#11-costuri)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Arhitectura

```
┌─────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE                       │
│                   (300+ PoP global)                      │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Cloudflare   │  │  Cloudflare   │  │  Cloudflare    │  │
│  │    Pages      │  │   Workers     │  │   Turnstile    │  │
│  │  (React SPA)  │  │  (API form)   │  │   (CAPTCHA)    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────┘  │
│         │                  │                              │
│  ┌──────┴──────────────────┴──────┐                      │
│  │     Cloudflare WAF / DDoS      │                      │
│  │     Bot Management / SSL       │                      │
│  └────────────────────────────────┘                      │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Cloudflare   │  │  Cloudflare   │  │   DNSSEC      │  │
│  │     D1        │  │  Email Routing│  │   + CAA       │  │
│  │  (SQLite DB)  │  │  (forwarding) │  │   + HSTS      │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │  Resend /  │
                    │  SendGrid  │
                    │ (email API)│
                    └───────────┘
```

**De ce Cloudflare Pages:**
- Zero server management — nu trebuie administrat niciun VPS
- Edge deployment — site-ul servit de pe 300+ locații globale
- TLS 1.3 automat — fără Certbot, fără certificate management
- DDoS protection inclusă — Cloudflare Unmetered Mitigation
- WAF gratuit — reguli de bază anti-bot, anti-XSS, anti-SQLi
- CI/CD automat — push la GitHub → deploy automat
- Cost: $0/lună pe Free Plan (suficient pentru acest site)

---

## 2. Cerințe preliminare

### Conturi necesare (toate gratuite):
| Serviciu | URL | Plan |
|----------|-----|------|
| Cloudflare | https://dash.cloudflare.com/sign-up | Free |
| GitHub | https://github.com | Free |
| Resend (email) | https://resend.com | Free (100 emails/zi) |
| Node.js (local) | https://nodejs.org | LTS v20+ |

### Tools locale (pe mașina de dezvoltare):
```bash
# Verifică Node.js
node --version    # minim v20.x

# Instalează Wrangler (CLI Cloudflare)
npm install -g wrangler

# Autentifică-te în Cloudflare
wrangler login
```

### Domeniu:
- cybershield.ro trebuie transferat sau configurat cu Cloudflare nameservers
- Nameservers Cloudflare sunt atribuite la crearea zonei (ex: `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`)

---

## 3. Structura proiectului

```
cybershield.ro/
├── public/
│   ├── index.html              # HTML entry point (cu CSP meta tag)
│   ├── favicon.svg             # Favicon SVG
│   ├── robots.txt              # SEO
│   └── _headers                # Cloudflare Pages custom headers
├── src/
│   ├── App.jsx                 # Componenta principală (cybershield_website.jsx)
│   ├── index.jsx               # React entry point
│   └── index.css               # Global CSS (minim)
├── functions/
│   └── api/
│       └── contact.js          # Cloudflare Worker — API formular
├── package.json
├── wrangler.toml               # Config Cloudflare Workers/D1
├── .gitignore
└── README.md
```

---

## 4. Setup pas cu pas

### 4.1. Creează proiectul React

```bash
# Creează cu Vite (recomandat pentru Cloudflare Pages)
npm create vite@latest cybershield-ro -- --template react
cd cybershield-ro

# Instalează dependențe
npm install
```

### 4.2. Copiază website-ul

Copiază conținutul fișierului `cybershield_website.jsx` în `src/App.jsx`.

`src/index.jsx`:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import CyberShield from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CyberShield />
  </React.StrictMode>
);
```

### 4.3. Configurează `public/index.html`

```html
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- CSP Meta Tag (backup — headerele din _headers au prioritate) -->
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'self';
      script-src 'self' https://challenges.cloudflare.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src https://fonts.gstatic.com;
      frame-src https://challenges.cloudflare.com;
      img-src 'self' data:;
      connect-src 'self';
      base-uri 'self';
      form-action 'self';" />

  <meta name="description" content="BASE64 CYBERSHIELD — Enterprise Cybersecurity Services. Penetration Testing, CTI, NIS2/DORA/GDPR Compliance, Telecom Security." />
  <meta name="robots" content="index, follow" />

  <!-- Open Graph -->
  <meta property="og:title" content="BASE64 CYBERSHIELD — Enterprise Cybersecurity" />
  <meta property="og:description" content="Penetration Testing, Cyber Threat Intelligence, NIS2/DORA/GDPR Compliance" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://cybershield.ro" />

  <title>BASE64 CYBERSHIELD — Enterprise Cybersecurity</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

  <!-- Cloudflare Turnstile (CAPTCHA) -->
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.jsx"></script>
</body>
</html>
```

### 4.4. Security Headers — `public/_headers`

Acest fișier este procesat automat de Cloudflare Pages:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 0
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-src https://challenges.cloudflare.com; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self';

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

### 4.5. `package.json`

```json
{
  "name": "cybershield-ro",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

### 4.6. `vite.config.js`

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,    // Nu expune codul sursă în producție
    minify: 'terser',    // Minificare agresivă
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
  },
});
```

### 4.7. Push la GitHub

```bash
git init
git add .
git commit -m "Initial commit — cybershield.ro"
git remote add origin https://github.com/YOUR_USER/cybershield-ro.git
git push -u origin main
```

### 4.8. Conectează la Cloudflare Pages

1. Mergi la **Cloudflare Dashboard → Workers & Pages → Create**
2. Selectează **Connect to Git**
3. Alege repo-ul `cybershield-ro`
4. Configurare build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**

Cloudflare va face build + deploy automat. URL-ul inițial va fi: `cybershield-ro.pages.dev`

---

## 5. Cloudflare Turnstile (CAPTCHA)

### 5.1. Creează widget Turnstile

1. **Cloudflare Dashboard → Turnstile → Add site**
2. Configurare:
   - **Site name**: `cybershield.ro`
   - **Domains**: `cybershield.ro`, `www.cybershield.ro`, `cybershield-ro.pages.dev`
   - **Widget Mode**: **Managed** (recomandat) sau **Invisible**
3. Notează: **Site Key** și **Secret Key**

### 5.2. Integrare în React

Înlocuiește secțiunea math challenge din `App.jsx` cu:

```jsx
{/* Cloudflare Turnstile Widget */}
<div
  className="cf-turnstile"
  data-sitekey="YOUR_SITE_KEY_HERE"
  data-callback="onTurnstileSuccess"
  data-theme="dark"
  data-language={lang}
></div>
```

Și adaugă callback-ul în componentă:

```jsx
// În componenta SecureForm, adaugă:
const [turnstileToken, setTurnstileToken] = useState(null);

useEffect(() => {
  window.onTurnstileSuccess = (token) => {
    setTurnstileToken(token);
  };
  return () => { delete window.onTurnstileSuccess; };
}, []);

// La submit, include token-ul:
const payload = {
  ...sanitizedData,
  "cf-turnstile-response": turnstileToken,
};
```

---

## 6. Cloudflare Workers (API Contact)

### 6.1. Creează `functions/api/contact.js`

Cloudflare Pages Functions rulează automat fișierele din `/functions/`:

```js
// functions/api/contact.js
// Cloudflare Pages Function — Contact Form API

// Rate limiting cu Cloudflare KV (sau in-memory per-isolate)
const RATE_LIMIT = 5;        // max requests
const RATE_WINDOW = 300;     // per 5 minute (secunde)

// Sanitizare server-side (defense in depth)
function sanitize(str) {
  if (typeof str !== "string") return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;")
    .replace(/javascript:/gi, "").replace(/on\w+\s*=/gi, "")
    .trim().slice(0, 5000);
}

function validEmail(e) {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(e) && e.length <= 254;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "https://cybershield.ro",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    // Rate limiting per IP
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rateLimitKey = `ratelimit:${ip}`;

    if (env.KV_STORE) {
      const current = parseInt(await env.KV_STORE.get(rateLimitKey) || "0");
      if (current >= RATE_LIMIT) {
        return new Response(JSON.stringify({ error: "rate_limit" }), { status: 429, headers });
      }
      await env.KV_STORE.put(rateLimitKey, String(current + 1), { expirationTtl: RATE_WINDOW });
    }

    // Parse body
    const body = await request.json();

    // Verify Cloudflare Turnstile
    const turnstileResponse = body["cf-turnstile-response"];
    if (!turnstileResponse) {
      return new Response(JSON.stringify({ error: "captcha_missing" }), { status: 400, headers });
    }

    const turnstileVerify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileResponse,
        remoteip: ip,
      }),
    });

    const turnstileResult = await turnstileVerify.json();
    if (!turnstileResult.success) {
      return new Response(JSON.stringify({ error: "captcha_failed" }), { status: 403, headers });
    }

    // Sanitize & validate inputs
    const name = sanitize(body.name).slice(0, 100);
    const email = sanitize(body.email).slice(0, 254);
    const company = sanitize(body.company || "").slice(0, 150);
    const service = sanitize(body.service || "").slice(0, 200);
    const message = sanitize(body.message).slice(0, 2000);

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers });
    }
    if (!validEmail(email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), { status: 400, headers });
    }

    // Opțional: Salvare în Cloudflare D1 (SQLite)
    if (env.DB) {
      // IMPORTANT: Parameterized query — previne SQL injection
      await env.DB.prepare(
        "INSERT INTO contact_submissions (name, email, company, service, message, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
      ).bind(name, email, company, service, message, ip).run();
    }

    // Trimite email via Resend
    if (env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "CyberShield Contact <noreply@cybershield.ro>",
          to: ["contact@cybershield.ro"],
          subject: `[Contact Form] ${service || "General"} — ${name}`,
          html: `
            <h2>Nouă solicitare de contact</h2>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Nume</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Companie</td><td style="padding:8px;border:1px solid #ddd">${company || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Serviciu</td><td style="padding:8px;border:1px solid #ddd">${service || "—"}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Mesaj</td><td style="padding:8px;border:1px solid #ddd">${message}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">IP</td><td style="padding:8px;border:1px solid #ddd">${ip}</td></tr>
            </table>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers });
  }
}

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "https://cybershield.ro",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
```

### 6.2. `wrangler.toml`

```toml
name = "cybershield-ro"
compatibility_date = "2025-01-01"

# KV Namespace pentru rate limiting
[[kv_namespaces]]
binding = "KV_STORE"
id = "YOUR_KV_NAMESPACE_ID"

# D1 Database (opțional — pentru stocarea submisiunilor)
[[d1_databases]]
binding = "DB"
database_name = "cybershield-contacts"
database_id = "YOUR_D1_DATABASE_ID"
```

### 6.3. Creează D1 Database (opțional)

```bash
# Creează baza de date
wrangler d1 create cybershield-contacts

# Creează tabelul
wrangler d1 execute cybershield-contacts --command="
CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT DEFAULT '',
  service TEXT DEFAULT '',
  message TEXT NOT NULL,
  ip TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'new'
);
CREATE INDEX idx_created_at ON contact_submissions(created_at);
CREATE INDEX idx_status ON contact_submissions(status);
"
```

### 6.4. Configurează secrets (Environment Variables)

În **Cloudflare Dashboard → Pages → Settings → Environment Variables**:

| Variable | Value | Type |
|----------|-------|------|
| `TURNSTILE_SECRET_KEY` | `0x4AAAAAAA...` (din Turnstile dashboard) | Secret |
| `RESEND_API_KEY` | `re_...` (din resend.com/api-keys) | Secret |

### 6.5. Creează KV Namespace

```bash
wrangler kv:namespace create KV_STORE
# Notează ID-ul și pune-l în wrangler.toml
```

---

## 7. DNS & Domeniu

### 7.1. Adaugă domeniul la Cloudflare

1. **Dashboard → Add a Site → cybershield.ro**
2. Selectează planul **Free**
3. Cloudflare îți va da 2 nameservers (ex: `ada.ns.cloudflare.com`)
4. Schimbă nameservers la registrar (unde ai cumpărat domeniul)

### 7.2. DNS Records

```
Type    Name              Content                      Proxy
─────   ────              ───────                      ─────
CNAME   cybershield.ro    cybershield-ro.pages.dev     ✅ Proxied
CNAME   www               cybershield-ro.pages.dev     ✅ Proxied
TXT     cybershield.ro    v=spf1 include:_spf.resend.com ~all
TXT     resend._domainkey DKIM record de la Resend
TXT     _dmarc            v=DMARC1; p=quarantine; rua=mailto:dmarc@cybershield.ro
CAA     cybershield.ro    0 issue "digicert.com"
CAA     cybershield.ro    0 issue "letsencrypt.org"
CAA     cybershield.ro    0 issuewild ";"
```

### 7.3. SSL/TLS

În **Dashboard → SSL/TLS**:
- **Encryption Mode**: `Full (strict)`
- **Minimum TLS Version**: `TLS 1.3` (doar 1.3, fără 1.2!)
- **Opportunistic Encryption**: On
- **TLS 1.3**: On
- **Automatic HTTPS Rewrites**: On
- **Always Use HTTPS**: On

### 7.4. DNSSEC

**Dashboard → DNS → DNSSEC → Enable DNSSEC**
Apoi adaugă DS record-ul la registrar conform instrucțiunilor.

### 7.5. Custom Domain pe Pages

1. **Pages → cybershield-ro → Custom domains → Set up a custom domain**
2. Adaugă: `cybershield.ro` și `www.cybershield.ro`
3. Cloudflare va crea automat CNAME records și certificate SSL

---

## 8. Security Headers — Configurare Cloudflare Dashboard

### 8.1. WAF Rules

**Dashboard → Security → WAF → Custom rules:**

**Regula 1 — Block Bad Bots:**
```
(cf.client.bot) and not (cf.bot_management.verified_bot)
→ Action: Block
```

**Regula 2 — Rate Limit API:**
```
(http.request.uri.path eq "/api/contact") and (http.request.method eq "POST")
→ Action: Rate limit (5 requests per 5 minutes per IP)
```

**Regula 3 — Challenge Suspicious:**
```
(cf.threat_score gt 30)
→ Action: Managed Challenge
```

### 8.2. Security Settings

**Dashboard → Security → Settings:**
- **Security Level**: `High`
- **Challenge Passage**: `30 minutes`
- **Browser Integrity Check**: `On`

### 8.3. Bot Fight Mode

**Dashboard → Security → Bots:**
- **Bot Fight Mode**: `On`
- **Block AI Scrapers**: `On` (opțional)

### 8.4. Page Rules (dacă e necesar)

```
URL: cybershield.ro/api/*
Settings: Cache Level = Bypass, Security Level = I'm Under Attack
```

---

## 9. Email Integration

### 9.1. Resend (recomandat)

1. Creează cont la https://resend.com
2. **Adaugă domeniu**: `cybershield.ro`
3. Resend îți va da DNS records (SPF, DKIM) — adaugă-le la Cloudflare DNS
4. Verifică domeniul
5. Creează **API Key** → pune-l ca `RESEND_API_KEY` în Cloudflare env vars
6. Email-urile vor veni de la `noreply@cybershield.ro`

### 9.2. Cloudflare Email Routing (alternativă pentru primire)

1. **Dashboard → Email → Email Routing**
2. Adaugă rută: `contact@cybershield.ro` → forward la email-ul personal
3. Aceasta permite primirea email-urilor pe `@cybershield.ro` fără server de mail

---

## 10. Monitorizare & Mentenanță

### 10.1. Cloudflare Analytics (gratuit)

- **Dashboard → Analytics**: trafic, amenințări blocate, performanță
- **Dashboard → Security → Events**: loguri WAF, challenge-uri

### 10.2. Uptime Monitoring

Configurează alertă gratuită:
- **UptimeRobot** (https://uptimerobot.com) — check la 5 min
- Monitorizează: `https://cybershield.ro` (HTTP 200)
- Alertă pe email + Telegram

### 10.3. Mentenanță regulată

| Task | Frecvență |
|------|-----------|
| Review WAF logs | Săptămânal |
| Verifică D1 submissions | Zilnic |
| Update npm dependencies | Lunar |
| Rotație API keys (Resend, Turnstile) | Trimestrial |
| Review DNS records | Trimestrial |
| Test form submission | Lunar |
| Verifică HSTS preload status | O singură dată (apoi verificare anuală) |
| Review Cloudflare security events | Săptămânal |

### 10.4. HSTS Preload

După ce totul funcționează stabil 1-2 săptămâni:
1. Mergi la https://hstspreload.org
2. Introdu `cybershield.ro`
3. Verifică cerințele (header HSTS cu `preload` flag)
4. Submit domeniul

---

## 11. Costuri

### Cloudflare Free Plan (suficient):

| Componentă | Cost |
|------------|------|
| Cloudflare Pages (hosting) | $0 |
| Cloudflare Workers (100k req/zi) | $0 |
| Cloudflare D1 (5 GB, 5M rânduri/zi) | $0 |
| Cloudflare KV (100k reads/zi) | $0 |
| Cloudflare Turnstile (CAPTCHA) | $0 |
| Cloudflare WAF (basic) | $0 |
| Cloudflare DDoS Protection | $0 |
| Cloudflare SSL/TLS | $0 |
| Cloudflare Email Routing | $0 |
| Resend (100 emails/zi) | $0 |
| UptimeRobot (50 monitoare) | $0 |
| **TOTAL** | **$0/lună** |

### Opțional (dacă crește traficul):

| Upgrade | Cost | Când |
|---------|------|------|
| Cloudflare Pro | $20/lună | WAF avansat, Image Optimization |
| Resend Pro | $20/lună | > 100 emails/zi |
| Workers Paid | $5/lună | > 100k requests/zi |

### Cost domeniu:
- `cybershield.ro` — aprox. €10-15/an la registrar-ul ales

---

## 12. Troubleshooting

### Build eșuează pe Cloudflare Pages
```bash
# Testează local înainte de push
npm run build
npx wrangler pages dev dist   # preview local
```

### Turnstile nu funcționează
- Verifică că domeniul e adăugat în Turnstile dashboard
- Verifică CSP — `frame-src https://challenges.cloudflare.com` trebuie inclus
- Testează cu Site Key de test: `1x00000000000000000000AA` (always pass)

### API /api/contact returnează 500
```bash
# Verifică loguri Workers
wrangler pages deployment tail
```

### Email-urile nu ajung
- Verifică SPF, DKIM, DMARC în DNS
- Verifică domain verification pe Resend
- Check spam folder

### Mixed Content warnings
- Asigură-te că toate resursele sunt HTTPS
- `Always Use HTTPS` este activat în Cloudflare

---

## Deploy Checklist Final

```
□ Repository GitHub creat și configurat
□ Cloudflare Pages conectat la GitHub
□ Build funcționează (npm run build)
□ Custom domain adăugat (cybershield.ro + www)
□ SSL/TLS setat pe Full (strict)
□ Minimum TLS version: 1.3
□ DNSSEC activat
□ CAA records adăugate
□ _headers file include toate security headers
□ Cloudflare Turnstile widget creat
□ TURNSTILE_SECRET_KEY configurat în env vars
□ Resend domeniu verificat
□ RESEND_API_KEY configurat în env vars
□ SPF + DKIM + DMARC records în DNS
□ KV Namespace creat (rate limiting)
□ D1 Database creat (opțional)
□ WAF rules configurate
□ Bot Fight Mode activat
□ Always Use HTTPS activat
□ UptimeRobot monitor creat
□ Test complet form submission
□ HSTS Preload submission (după stabilizare)
```

---

*Document generat de BASE64 CYBERSHIELD — Februarie 2026*
*Versiune: 1.0 | Clasificare: INTERN*
