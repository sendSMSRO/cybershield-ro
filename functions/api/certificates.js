// ═══════════════════════════════════════════════════════════════════════════
// BASE64 CYBERSHIELD — Certificate Verification API
// File: functions/api/certificates.js
// Route: GET /api/certificates?id=B64CS-2026-0306-SRBA-001
// Binding: DB (D1 — cybershield-contacts, tabela: certificates)
// ═══════════════════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  "https://cybershield.ro",
  "https://www.cybershield.ro",
];

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };
}

// Format valid: B64CS-YYYY-MMDD-CLIENT-NNN
function validateFormat(id) {
  return /^B64CS-\d{4}-\d{4}-[A-Z0-9]+-\d{3}$/.test(id);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(request);

  try {
    const url    = new URL(request.url);
    const certId = (url.searchParams.get("id") || "").trim().toUpperCase();

    if (!certId) {
      return new Response(
        JSON.stringify({ error: "missing_id" }),
        { status: 400, headers }
      );
    }

    if (!validateFormat(certId)) {
      return new Response(
        JSON.stringify({ error: "invalid_format" }),
        { status: 400, headers }
      );
    }

    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: "db_unavailable" }),
        { status: 503, headers }
      );
    }

    const row = await env.DB
      .prepare(
        `SELECT cert_number, issued_date, validity_months,
                target_domain, assessment_type, lead_pentester,
                client_name, is_active
         FROM certificates
         WHERE cert_number = ?
         LIMIT 1`
      )
      .bind(certId)
      .first();

    if (!row) {
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers }
      );
    }

    // Calcul expiry & zile rămase
    const issued  = new Date(row.issued_date); // YYYY-MM-DD din DB
    const expiry  = new Date(issued);
    expiry.setMonth(expiry.getMonth() + row.validity_months);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((expiry - today) / 864e5);
    const isValid = row.is_active === 1 && daysRemaining > 0;

    return new Response(
      JSON.stringify({
        found:            true,
        cert_number:      row.cert_number,
        issued_date:      row.issued_date,
        expiry_date:      expiry.toISOString().split("T")[0],
        validity_months:  row.validity_months,
        days_remaining:   daysRemaining,
        is_valid:         isValid,
        target_domain:    row.target_domain,
        assessment_type:  row.assessment_type,
        lead_pentester:   row.lead_pentester,
        client_name:      row.client_name,
      }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error("Certificate API error:", err);
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
      "Access-Control-Allow-Origin":  "https://cybershield.ro",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age":       "86400",
    },
  });
}