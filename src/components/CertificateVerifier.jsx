import { useState, useRef } from "react";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const CS = {
  dark:   "#0A1628",
  navy2:  "#132744",
  navy3:  "#0F2140",
  cyan:   "#00D4FF",
  green:  "#00E676",
  alert:  "#FF3D71",
  orange: "#FFAA00",
  gray:   "#7A8BA0",
  lgray:  "#B8C4D4",
};

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  RO: {
    sectionTitle:  "Verificare Certificat",
    sectionSub:    "Autentificați un certificat emis de BASE64 CYBERSHIELD",
    fieldLabel:    "Nr. Certificat",
    placeholder:   "Introduceți numărul certificatului — ex: B64CS-2026-0306-SRBA-001",
    btnVerify:     "Verifică",
    btnClear:      "Curăță",
    validLabel:    "CERTIFICAT VALID",
    expiredLabel:  "CERTIFICAT EXPIRAT",
    notFound:      "Certificatul nu a fost găsit în registrul nostru.",
    notFoundSub:   "Verificați că ați introdus numărul corect.",
    invalidFmt:    "Format invalid. Exemplu: B64CS-YYYY-MMDD-CLIENT-NNN",
    issuedOn:      "Emis la",
    validUntil:    "Valabil până la",
    daysLeft:      "zile rămase",
    dayLeft:       "zi rămasă",
    expired:       "Expirat",
    target:        "Domeniu auditat",
    type:          "Tip evaluare",
    lead:          "Lead PenTester",
    certNo:        "Nr. certificat",
    howTitle:      "Cum funcționează?",
    how1:          "Introduceți numărul de certificat exact (format: B64CS-YYYY-MMDD-CLIENT-NNN)",
    how2:          "Sistemul verifică registrul nostru securizat de certificate emise",
    how3:          "Rezultatul confirmă autenticitatea și valabilitatea certificatului.",
    disclaimer:    "Certificatele BASE64 CYBERSHIELD sunt valabile 12 luni de la data emiterii. Pentru orice suspiciune de falsificare, ",
    disclaimerLink:"contactați-ne",
    barPct:        "valabilitate rămasă",
    progress:      "Verificare...",
    contactPath:   "/#contact",
  },
  EN: {
    sectionTitle:  "Certificate Verification",
    sectionSub:    "Authenticate a certificate issued by BASE64 CYBERSHIELD",
    fieldLabel:    "Certificate No.",
    placeholder:   "Enter certificate number — e.g.: B64CS-2026-0306-SRBA-001",
    btnVerify:     "Verify",
    btnClear:      "Clear",
    validLabel:    "VALID CERTIFICATE",
    expiredLabel:  "EXPIRED CERTIFICATE",
    notFound:      "Certificate not found in our registry.",
    notFoundSub:   "Please double-check the number.",
    invalidFmt:    "Invalid format. Example: B64CS-YYYY-MMDD-CLIENT-NNN",
    issuedOn:      "Issued on",
    validUntil:    "Valid until",
    daysLeft:      "days remaining",
    dayLeft:       "day remaining",
    expired:       "Expired",
    target:        "Audited domain",
    type:          "Assessment type",
    lead:          "Lead PenTester",
    certNo:        "Certificate no.",
    howTitle:      "How does it work?",
    how1:          "Enter the exact certificate number (format: B64CS-YYYY-MMDD-CLIENT-NNN)",
    how2:          "The system checks our secure registry of issued certificates",
    how3:          "The result confirms the authenticity and validity of the certificate.",
    disclaimer:    "BASE64 CYBERSHIELD certificates are valid for 12 months from the issue date. For any suspected forgery, ",
    disclaimerLink:"contact us",
    barPct:        "validity remaining",
    progress:      "Verifying...",
    contactPath:   "/#contact",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(isoStr) {
  // "2026-03-06" → "06.03.2026"
  const [y, m, d] = isoStr.split("-");
  return `${d}.${m}.${y}`;
}

function validateFormat(val) {
  return /^B64CS-\d{4}-\d{4}-[A-Z0-9]+-\d{3}$/.test(val.trim().toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ScanLine() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden",
      borderRadius: "12px", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", left: 0, right: 0, height: "2px",
        background: `linear-gradient(90deg, transparent, ${CS.cyan}, transparent)`,
        animation: "cs-scanline 1.5s linear infinite", opacity: 0.6,
      }} />
    </div>
  );
}

function BadgeRow({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", padding: "10px 0",
      borderBottom: "1px solid rgba(255,255,255,0.06)", gap: "16px" }}>
      <span style={{ color: CS.gray, fontSize: "12px", textTransform: "uppercase",
        letterSpacing: "0.08em", fontFamily: "monospace", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ color: accent || CS.lgray, fontSize: "13px",
        fontFamily: "monospace", textAlign: "right", wordBreak: "break-all" }}>
        {value}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CertificateVerifier({ lang = "RO" }) {
  const t = T[lang];
  const [input,  setInput]  = useState("");
  const [state,  setState]  = useState("idle"); // idle|loading|valid|expired|notfound|invalid
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const handleInput = (e) => {
    setInput(e.target.value.toUpperCase());
    if (state !== "idle") setState("idle");
  };

  const handleVerify = async () => {
    const val = input.trim().toUpperCase();
    if (!val) return;

    if (!validateFormat(val)) {
      setState("invalid");
      return;
    }

    setState("loading");

    try {
      const res  = await fetch(`/api/certificates?id=${encodeURIComponent(val)}`);
      const data = await res.json();

      if (!data.found) {
        setState("notfound");
        setResult(null);
        return;
      }

      setResult(data);
      setState(data.is_valid ? "valid" : "expired");

    } catch {
      setState("notfound");
      setResult(null);
    }
  };

  const handleClear = () => {
    setInput(""); setState("idle"); setResult(null);
    inputRef.current?.focus();
  };

  const statusColor = state === "valid" ? CS.green : state === "expired" ? CS.alert : CS.cyan;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&display=swap');
        @keyframes cs-scanline { 0% { top:-2px } 100% { top:100% } }
        @keyframes cs-fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cs-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(0,230,118,0.4)} 50%{box-shadow:0 0 0 8px rgba(0,230,118,0)} }
        @keyframes cs-spin { to{transform:rotate(360deg)} }
        .cs-input::placeholder{color:#3A4F6A}
        .cs-input:focus{outline:none;border-color:${CS.cyan} !important}
        .cs-vbtn:hover:not(:disabled){background:${CS.cyan} !important;color:${CS.dark} !important}
        .cs-cbtn:hover{border-color:${CS.lgray} !important;color:${CS.lgray} !important}
      `}</style>

      <section id="verifica-certificat" style={{
        background: CS.dark, fontFamily: "'Exo 2', sans-serif",
        padding: "80px 24px", position: "relative", overflow: "hidden",
      }}>
        {/* Grid bg */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none",
          backgroundImage: `linear-gradient(${CS.cyan} 1px,transparent 1px),linear-gradient(90deg,${CS.cyan} 1px,transparent 1px)`,
          backgroundSize: "40px 40px",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)", width: "600px", height: "400px",
          background: `radial-gradient(ellipse,rgba(0,212,255,0.04) 0%,transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "720px", margin: "0 auto", position: "relative" }}>

          {/* ── Header ── */}
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
              borderRadius: "100px", padding: "6px 16px", marginBottom: "20px",
            }}>
              <span style={{ color: CS.cyan, fontSize: "11px", letterSpacing: "0.15em",
                fontFamily: "'Share Tech Mono', monospace" }}>
                ◉ CERT_VERIFY_SYS v1.0
              </span>
            </div>
            <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 700, margin: "0 0 12px",
              color: "white", letterSpacing: "-0.01em" }}>
              {t.sectionTitle}
            </h2>
            <p style={{ color: CS.gray, fontSize: "15px", margin: 0 }}>{t.sectionSub}</p>
          </div>

          {/* ── Input Panel ── */}
          <div style={{
            background: CS.navy2, border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px", padding: "32px", position: "relative",
            overflow: "hidden", marginBottom: "24px",
          }}>
            {state === "loading" && <ScanLine />}

            <label style={{ display: "block", color: CS.lgray, fontSize: "11px",
              letterSpacing: "0.1em", textTransform: "uppercase",
              fontFamily: "'Share Tech Mono', monospace", marginBottom: "10px" }}>
              {t.fieldLabel}
            </label>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                ref={inputRef}
                className="cs-input"
                value={input}
                onChange={handleInput}
                onKeyDown={e => e.key === "Enter" && handleVerify()}
                placeholder={t.placeholder}
                spellCheck={false}
                autoComplete="off"
                style={{
                  flex: "1 1 280px",
                  background: "rgba(10,22,40,0.8)",
                  border: `1px solid ${
                    state === "invalid"  ? CS.alert :
                    state === "valid"    ? CS.green :
                    state === "expired"  ? CS.alert :
                    "rgba(255,255,255,0.12)"
                  }`,
                  borderRadius: "8px", padding: "14px 18px",
                  color: "white", fontSize: "14px",
                  fontFamily: "'Share Tech Mono', monospace",
                  letterSpacing: "0.05em", transition: "border-color 0.2s",
                }}
              />

              <button
                className="cs-vbtn"
                onClick={handleVerify}
                disabled={!input.trim() || state === "loading"}
                style={{
                  background: "transparent",
                  border: `1px solid ${CS.cyan}`,
                  borderRadius: "8px", padding: "14px 28px",
                  color: CS.cyan, fontSize: "13px", fontWeight: 600,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  cursor: input.trim() && state !== "loading" ? "pointer" : "not-allowed",
                  opacity: input.trim() ? 1 : 0.4,
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: "8px",
                }}
              >
                {state === "loading" ? (
                  <>
                    <span style={{
                      width: "14px", height: "14px",
                      border: "2px solid rgba(0,212,255,0.3)",
                      borderTopColor: CS.cyan, borderRadius: "50%",
                      display: "inline-block", animation: "cs-spin 0.8s linear infinite",
                    }} />
                    {t.progress}
                  </>
                ) : t.btnVerify}
              </button>

              {(input || state !== "idle") && (
                <button
                  className="cs-cbtn"
                  onClick={handleClear}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px", padding: "14px 20px",
                    color: CS.gray, fontSize: "13px",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {t.btnClear}
                </button>
              )}
            </div>

            <p style={{ color: CS.gray, fontSize: "11px", marginTop: "10px", marginBottom: 0,
              fontFamily: "'Share Tech Mono', monospace" }}>
              FORMAT → B64CS-YYYY-MMDD-CLIENT-NNN
            </p>
          </div>

          {/* ── Error States ── */}
          {(state === "invalid" || state === "notfound") && (
            <div style={{
              background: "rgba(255,61,113,0.08)",
              border: "1px solid rgba(255,61,113,0.3)",
              borderRadius: "12px", padding: "20px 24px",
              display: "flex", alignItems: "flex-start", gap: "14px",
              animation: "cs-fadeUp 0.3s ease", marginBottom: "24px",
            }}>
              <span style={{ fontSize: "22px", flexShrink: 0 }}>⚠</span>
              <div>
                <p style={{ color: CS.alert, fontWeight: 600, margin: "0 0 4px", fontSize: "14px" }}>
                  {state === "invalid" ? t.invalidFmt : t.notFound}
                </p>
                {state === "notfound" && (
                  <p style={{ color: CS.gray, fontSize: "12px", margin: 0 }}>{t.notFoundSub}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Result Card ── */}
          {result && (state === "valid" || state === "expired") && (
            <div style={{
              background: state === "valid" ? "rgba(0,230,118,0.05)" : "rgba(255,61,113,0.05)",
              border: `1px solid ${state === "valid" ? "rgba(0,230,118,0.3)" : "rgba(255,61,113,0.3)"}`,
              borderRadius: "16px", overflow: "hidden",
              animation: "cs-fadeUp 0.4s ease", marginBottom: "24px",
            }}>
              {/* Status header */}
              <div style={{
                background: state === "valid" ? "rgba(0,230,118,0.1)" : "rgba(255,61,113,0.1)",
                padding: "20px 28px", display: "flex",
                justifyContent: "space-between", alignItems: "center",
                flexWrap: "wrap", gap: "12px",
                borderBottom: `1px solid ${state === "valid" ? "rgba(0,230,118,0.15)" : "rgba(255,61,113,0.15)"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{
                    width: "12px", height: "12px", borderRadius: "50%",
                    background: statusColor, boxShadow: `0 0 8px ${statusColor}`,
                    display: "inline-block",
                    animation: state === "valid" ? "cs-pulse 2s infinite" : undefined,
                  }} />
                  <span style={{ color: statusColor, fontWeight: 700, fontSize: "15px",
                    letterSpacing: "0.12em", fontFamily: "'Share Tech Mono', monospace" }}>
                    {state === "valid" ? t.validLabel : t.expiredLabel}
                  </span>
                </div>
                <div style={{
                  background: state === "valid" ? "rgba(0,230,118,0.15)" : "rgba(255,61,113,0.15)",
                  borderRadius: "100px", padding: "8px 18px",
                  fontFamily: "'Share Tech Mono', monospace",
                  color: statusColor, textAlign: "right", lineHeight: 1.3,
                }}>
                  {state === "valid" ? (
                    <>
                      <span style={{ display: "block", fontSize: "15px", fontWeight: 700, letterSpacing: "0.04em" }}>
                        {lang === "RO" ? "până la" : "until"} {fmtDate(result.expiry_date)}
                      </span>
                      <span style={{ display: "block", fontSize: "11px", opacity: 0.7, marginTop: "2px" }}>
                        {result.days_remaining} {result.days_remaining === 1 ? t.dayLeft : t.daysLeft}
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ display: "block" }}>{t.expired}</span>
                      <span style={{ display: "block", fontSize: "11px", opacity: 0.7, marginTop: "2px" }}>
                        {lang === "RO" ? "din" : "since"} {fmtDate(result.expiry_date)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: "20px 28px" }}>
                <BadgeRow label={t.certNo}   value={result.cert_number}   accent={CS.cyan} />
                <BadgeRow label={t.issuedOn} value={fmtDate(result.issued_date)} />
                <BadgeRow
                  label={t.validUntil}
                  value={fmtDate(result.expiry_date)}
                  accent={state === "valid" ? CS.green : CS.alert}
                />

                {/* Validity progress bar */}
                {state === "valid" && (() => {
                  const total = result.validity_months * 30.4;
                  const pct   = Math.max(0, Math.min(100, (result.days_remaining / total) * 100));
                  const color = pct > 50 ? CS.green : pct > 20 ? CS.orange : CS.alert;
                  return (
                    <div style={{ marginTop: "18px" }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        fontSize: "11px", color: CS.gray,
                        fontFamily: "'Share Tech Mono', monospace", marginBottom: "6px",
                      }}>
                        <span>{fmtDate(result.issued_date)}</span>
                        <span>{pct.toFixed(0)}% {t.barPct}</span>
                        <span>{fmtDate(result.expiry_date)}</span>
                      </div>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.08)",
                        borderRadius: "100px", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: `linear-gradient(90deg, ${color}, ${CS.cyan})`,
                          borderRadius: "100px", transition: "width 0.8s ease",
                        }} />
                      </div>
                    </div>
                  );
                })()}

                <div style={{
                  marginTop: "20px", paddingTop: "16px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", flexWrap: "wrap", gap: "8px",
                }}>
                  <span style={{ color: CS.gray, fontSize: "11px",
                    fontFamily: "'Share Tech Mono', monospace" }}>
                    BASE64 CYBERSHIELD S.R.L.
                  </span>
                  <span style={{ color: CS.cyan, fontSize: "11px",
                    fontFamily: "'Share Tech Mono', monospace" }}>
                    cybershield.ro
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── How it works ── */}
          <div style={{
            background: CS.navy3, border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "12px", padding: "24px 28px",
          }}>
            <h3 style={{ color: CS.lgray, fontSize: "12px", fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 16px" }}>
              {t.howTitle}
            </h3>
            {[t.how1, t.how2, t.how3].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: "12px",
                alignItems: "flex-start", marginBottom: i < 2 ? "12px" : 0 }}>
                <span style={{
                  width: "22px", height: "22px",
                  background: "rgba(0,212,255,0.12)",
                  border: "1px solid rgba(0,212,255,0.25)",
                  borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: "10px", color: CS.cyan,
                  fontFamily: "monospace", flexShrink: 0, marginTop: "1px",
                }}>
                  {i + 1}
                </span>
                <span style={{ color: CS.gray, fontSize: "13px", lineHeight: 1.6 }}>
                  {step}
                </span>
              </div>
            ))}

            {/* ── Disclaimer cu link catre pagina de contact ── */}
            <p style={{
              color: "#3A4F6A", fontSize: "11px",
              marginTop: "20px", marginBottom: 0,
              borderTop: "1px solid rgba(255,255,255,0.05)",
              paddingTop: "14px", lineHeight: 1.6,
            }}>
              {t.disclaimer}
              <a
                href={t.contactPath}
                style={{ color: CS.cyan, textDecoration: "none", borderBottom: `1px solid rgba(0,212,255,0.3)` }}
              >
                {t.disclaimerLink}
              </a>
              .
            </p>
          </div>

        </div>
      </section>
    </>
  );
}