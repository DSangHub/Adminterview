"use client";
import { useEffect, useRef, useState } from "react";
import { Shell, scoreColor } from "../ui";

type Msg = { role: "assistant" | "user"; content: string };

export default function Practice() {
  const role = "Office Administrator";
  const [email, setEmail] = useState("");
  const [tokens, setTokens] = useState(0);
  const [trial, setTrial] = useState<{ started: boolean; active: boolean; daysLeft: number } | null>(null);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [canFinish, setCanFinish] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [note, setNote] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("canceled") === "1") setNote("Payment canceled — you can try again anytime.");
    if (q.get("paid") === "1") {
      if (q.get("plan") === "single") begin();
      else setNote("Payment complete — your tokens have been added.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, result]);

  async function refresh(e: string) {
    if (!e) { setTokens(0); setTrial(null); return; }
    const r = await fetch(`/api/practice/wallet?email=${encodeURIComponent(e)}`);
    const d = await r.json();
    setTokens(d.tokens || 0);
    setTrial(d.trial || null);
  }

  // Free week: start the trial clock (if needed) and begin.
  async function startFree() {
    if (!email) { setNote("Enter your email to start your free week."); return; }
    setNote("");
    setLoading(true);
    try {
      await fetch("/api/practice/wallet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "startTrial" }),
      });
      begin();
    } catch { setLoading(false); }
  }

  async function buy(plan: string) {
    setNote("");
    if (plan !== "single" && !email) { setNote("Enter your email to buy tokens."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/practice/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email }),
      });
      const d = await r.json();
      if (d.url) { window.location.href = d.url; return; }
      if (plan === "single") { begin(); return; }
      setTokens(d.balance ?? tokens);
      setNote(`Added ${d.granted} tokens. Balance: ${d.balance}.`);
    } finally { setLoading(false); }
  }

  async function useToken() {
    if (!email) { setNote("Enter your email first."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/practice/wallet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!r.ok) { setNote("No tokens left — start your free week or buy a pack."); setLoading(false); return; }
      setTokens(d.tokens);
      begin();
    } catch { setLoading(false); }
  }

  async function begin() {
    setStarted(true);
    setLoading(true);
    const r = await fetch("/api/practice", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, messages: [] }),
    });
    const d = await r.json();
    setMessages([{ role: "assistant", content: d.reply }]);
    setLoading(false);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input.trim() } as Msg];
    setMessages(next); setInput(""); setLoading(true);
    const r = await fetch("/api/practice", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, messages: next }),
    });
    const d = await r.json();
    setMessages([...next, { role: "assistant", content: d.reply }]);
    setCanFinish(Boolean(d.done));
    setLoading(false);
  }

  async function finish() {
    setLoading(true);
    const r = await fetch("/api/practice", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, messages, action: "finish", email }),
    });
    setResult(await r.json());
    setLoading(false);
  }

  const bubble = (m: Msg) => (
    <div style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", margin: "8px 0" }}>
      <div style={{
        maxWidth: "78%", padding: "10px 14px", borderRadius: 14, fontSize: 15, lineHeight: 1.5,
        background: m.role === "user" ? "var(--blue)" : "#f1f5f9",
        color: m.role === "user" ? "#fff" : "var(--ink)",
      }}>{m.content}</div>
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--line)",
    fontSize: 15, marginTop: 6, fontFamily: "inherit",
  };
  const opt: React.CSSProperties = {
    border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px",
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
  };

  // Trial state: never started or still active -> show the free week hero; expired -> emphasize tokens.
  const trialExpired = Boolean(trial?.started && !trial?.active);
  const daysLeftLabel =
    trial?.started && trial?.active
      ? `${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left in your free week`
      : "7 days of unlimited practice — no card needed";

  return (
    <Shell>
      <span className="eyebrow">Candidate tools</span>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: "10px 0 4px" }}>Practice interview with AI</h1>
      <p style={{ color: "var(--slate)", maxWidth: 620 }}>
        Rehearse real {role} scenarios with an AI coach that gives feedback after every answer,
        then a readiness score.
      </p>

      {!started && !result && (
        <>
          {/* ===== FREE WEEK — always front and center ===== */}
          {!trialExpired && (
            <div
              className="card"
              style={{
                maxWidth: 620, marginTop: 22, padding: "22px 22px 24px",
                border: "2px solid #7ee2a8",
                background: "linear-gradient(180deg, rgba(12,163,12,.10), rgba(12,163,12,.03))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 30, lineHeight: 1 }}>🎁</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#0a7a0a" }}>
                    Free trial
                  </div>
                  <h2 style={{ fontSize: 23, fontWeight: 800, margin: "2px 0 0" }}>
                    Your first week is <span style={{ color: "#0a7a0a" }}>free</span>
                  </h2>
                </div>
              </div>
              <p style={{ margin: "10px 0 0", color: "var(--slate)", fontSize: 15 }}>
                {daysLeftLabel}. Test your interview skills as many times as you like — an AI coach
                gives feedback after every answer, then a readiness score.
              </p>

              <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginTop: 16 }}>Your email</label>
              <input
                style={inputStyle} type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} onBlur={(e) => refresh(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") startFree(); }}
              />
              <button
                className="btn btn-primary"
                onClick={startFree}
                disabled={loading}
                style={{ marginTop: 12, width: "100%", justifyContent: "center", fontSize: 16, padding: "13px 16px" }}
              >
                {loading ? "Starting…" : "Start my free week →"}
              </button>
              <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--mut)", textAlign: "center" }}>
                No credit card required. We only use your email to hold your free week.
              </p>
              {note && <p style={{ color: "#b45309", marginTop: 10, fontSize: 14, fontWeight: 600 }}>{note}</p>}
            </div>
          )}

          {/* ===== Token balance (if any) ===== */}
          {tokens > 0 && (
            <div className="card" style={{ maxWidth: 620, marginTop: 14 }}>
              <div style={{ ...opt, border: "none", padding: 0 }}>
                <div><b>{tokens}</b> practice token{tokens > 1 ? "s" : ""} available</div>
                <button className="btn btn-primary" onClick={useToken} disabled={loading}>Use 1 token &amp; start →</button>
              </div>
            </div>
          )}

          {/* ===== After the free week — secondary ===== */}
          <div className="card" style={{ maxWidth: 620, marginTop: 14 }}>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>
              {trialExpired ? "Your free week has ended — keep practicing:" : "When your free week ends, keep practicing:"}
            </p>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--mut)" }}>
              Pay as you go, or grab time tokens that never expire.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={opt}>
                <div><b>Single session</b><div style={{ fontSize: 13, color: "var(--slate)" }}>One mock interview + feedback</div></div>
                <button className="btn btn-ghost" onClick={() => buy("single")} disabled={loading}>$2 →</button>
              </div>
              <div style={opt}>
                <div><b>5 time tokens</b><div style={{ fontSize: 13, color: "var(--slate)" }}>Never expire · 5 sessions</div></div>
                <button className="btn btn-ghost" onClick={() => buy("pack10")} disabled={loading}>$10 →</button>
              </div>
              <div style={{ ...opt, borderColor: "#c9defb", background: "rgba(42,120,214,.05)" }}>
                <div><b>10 time tokens</b> <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 700 }}>best value</span><div style={{ fontSize: 13, color: "var(--slate)" }}>Never expire · max balance</div></div>
                <button className="btn btn-primary" onClick={() => buy("pack20")} disabled={loading}>$20 →</button>
              </div>
            </div>
          </div>
        </>
      )}

      {started && !result && (
        <div className="card" style={{ maxWidth: 620, marginTop: 22 }}>
          <div style={{ maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
            {messages.map((m, i) => <div key={i}>{bubble(m)}</div>)}
            {loading && <div style={{ color: "var(--mut)", fontSize: 13, margin: "6px 4px" }}>Coach is typing…</div>}
            <div ref={endRef} />
          </div>
          {!canFinish ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                style={{ flex: 1, padding: "11px 13px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 15, fontFamily: "inherit" }}
                placeholder="Type your answer…" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              />
              <button className="btn btn-primary" onClick={send} disabled={loading}>Send</button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={finish} disabled={loading} style={{ marginTop: 12 }}>
              {loading ? "Scoring…" : "Finish & get my feedback →"}
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="card" style={{ maxWidth: 620, marginTop: 22, textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--slate)" }}>Your readiness score</div>
          <div style={{ fontSize: 56, fontWeight: 800, color: scoreColor(result.readiness) }}>{result.readiness}</div>
          <p style={{ color: "var(--slate)", fontSize: 15, maxWidth: 460, margin: "8px auto 0" }}>{result.feedback}</p>
          <a className="btn btn-primary" href="/practice" style={{ marginTop: 18 }}>Practice again →</a>
        </div>
      )}
    </Shell>
  );
}
