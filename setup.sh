#!/bin/bash
# ══════════════════════════════════════════════════════
# BASE64 CYBERSHIELD — Quick Setup Script
# Rulează pe mașina de dezvoltare (nu pe server!)
# ══════════════════════════════════════════════════════

set -e
echo "🛡️  BASE64 CYBERSHIELD — Setup Cloudflare Pages"
echo "================================================"

# 1. Verifică dependențe
echo ""
echo "📋 Verificare dependențe..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js nu este instalat. Descarcă de la https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm nu este instalat."; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git nu este instalat."; exit 1; }

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo "⚠️  Node.js $NODE_VER detectat. Se recomandă v20+."
fi

echo "✅ Node.js $(node -v)"
echo "✅ npm $(npm -v)"
echo "✅ git $(git --version | cut -d' ' -f3)"

# 2. Instalează Wrangler
echo ""
echo "📦 Instalare Wrangler CLI..."
npm install -g wrangler 2>/dev/null || npx wrangler --version

# 3. Creează proiectul
echo ""
echo "🏗️  Creare proiect Vite + React..."
PROJECT_DIR="cybershield-ro"

if [ -d "$PROJECT_DIR" ]; then
  echo "⚠️  Directorul $PROJECT_DIR există deja. Sar peste creare."
else
  npm create vite@latest $PROJECT_DIR -- --template react
fi

cd $PROJECT_DIR

# 4. Instalează dependențe
echo ""
echo "📦 Instalare dependențe npm..."
npm install

# 5. Creează structura
echo ""
echo "📁 Creare structură fișiere..."
mkdir -p public functions/api

# 6. Instrucțiuni
echo ""
echo "════════════════════════════════════════════════"
echo "✅ Proiectul a fost creat cu succes!"
echo ""
echo "📋 Pași următori:"
echo "  1. Copiază cybershield_website.jsx → src/App.jsx"
echo "  2. Copiază _headers → public/_headers"
echo "  3. Copiază functions_api_contact.js → functions/api/contact.js"
echo "  4. Copiază wrangler.toml → wrangler.toml"
echo "  5. Editează public/index.html (vezi DEPLOYMENT_GUIDE.md)"
echo "  6. Editează vite.config.js (vezi DEPLOYMENT_GUIDE.md)"
echo ""
echo "🧪 Test local:"
echo "  npm run dev                    # Dev server"
echo "  npm run build                  # Build producție"
echo "  npx wrangler pages dev dist    # Preview cu Workers"
echo ""
echo "🚀 Deploy:"
echo "  git init && git add . && git commit -m 'init'"
echo "  git remote add origin https://github.com/USER/cybershield-ro.git"
echo "  git push -u origin main"
echo "  → Conectează la Cloudflare Pages din Dashboard"
echo ""
echo "🔐 Nu uita să configurezi în Cloudflare Dashboard:"
echo "  - TURNSTILE_SECRET_KEY (env var)"
echo "  - RESEND_API_KEY (env var)"
echo "  - KV Namespace (wrangler kv:namespace create KV_STORE)"
echo "  - D1 Database (wrangler d1 create cybershield-contacts)"
echo "════════════════════════════════════════════════"
