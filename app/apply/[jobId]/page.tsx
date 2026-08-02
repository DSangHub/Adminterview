"use client";
import { useEffect, useState } from "react";
import { Shell, scoreColor } from "../../ui";

export default function Apply({ params }: { params: { jobId: string } }) {
  const jobId = params.jobId;
  const [job, setJob] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => {
        const j = (d.jobs || []).find((x: any) => x.id === jobId) || (d.jobs || [])[0];
        setJob(j);
        setAnswers(new Array((j?.questions || []).length).fill(""));
      });
  }, [jobId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, name, email, answers }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setResult(d.application);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const input: React.CSSProperties = {
    width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid var(--line)",
    fontSize: 15, marginTop: 6, fontFamily: "inherit",
  };

  if (!job) return <Shell><p>Loading…</p></Shell>;

  if (result) {
    const s = result.subscores || {};
    const bars = [
      ["Communication", s.communication], ["Judgment", s.judgment],
      ["Attention to detail", s.attention], ["Speed", s.speed],
    ] as [string, number][];
    return (
      <Shell>
        <div className="card" style={{ maxWidth: 620 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>Submitted ✓</h2>
            <span style={{ background: "rgba(12,163,12,.12)", color: "#0a7a0a", fontWeight: 700, fontSize: 13, padding: "6px 12px", borderRadius: 999 }}>{result.verdict}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, margin: "18px 0 8px" }}>
            <div style={{ fontSize: 54, fontWeight: 800, color: scoreColor(result.score) }}>{result.score}</div>
            <div style={{ color: "var(--slate)" }}>Fit score / 100<br />for {result.candidate_name}</div>
          </div>
          <div style={{ marginTop: 10 }}>
            {bars.map(([label, val]) => (
              <div key={label} style={{ margin: "10px 0" }}>
                <div style={{ fontSize: 13, color: "#334155", display: "flex", justifyContent: "space-between" }}>
                  <span>{label}</span><b>{val}</b>
                </div>
                <div style={{ height: 9, background: "#eef1f7", borderRadius: 5, marginTop: 4 }}>
                  <div style={{ width: `${val}%`, height: 9, background: scoreColor(val), borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: "var(--slate)", fontSize: 14, marginTop: 14, fontStyle: "italic" }}>{result.reason}</p>
          <a className="btn btn-primary" href="/dashboard" style={{ marginTop: 16 }}>See it in the dashboard →</a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <span className="eyebrow">Candidate application</span>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: "10px 0 4px" }}>{job.title}</h1>
      <p style={{ color: "var(--slate)", maxWidth: 620 }}>Answer the scenario questions below. The AI scores your responses the moment you submit.</p>
      <form onSubmit={submit} className="card" style={{ maxWidth: 620, marginTop: 22 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontWeight: 600, fontSize: 14 }}>Your name</label>
            <input style={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontWeight: 600, fontSize: 14 }}>Email (optional)</label>
            <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        {job.questions.map((q: string, i: number) => (
          <div key={i} style={{ marginTop: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 14 }}>{i + 1}. {q}</label>
            <textarea
              style={{ ...input, minHeight: 70 }}
              value={answers[i] || ""}
              onChange={(e) => {
                const a = [...answers]; a[i] = e.target.value; setAnswers(a);
              }}
            />
          </div>
        ))}
        <button className="btn btn-primary" disabled={loading} style={{ marginTop: 18 }}>
          {loading ? "Scoring…" : "Submit — get scored →"}
        </button>
        {error && <p style={{ color: "var(--crit)", marginTop: 10 }}>{error}</p>}
      </form>
    </Shell>
  );
}
