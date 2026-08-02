"use client";
import { useState } from "react";
import { Shell } from "../ui";

export default function Employers() {
  const [title, setTitle] = useState("Office Administrator");
  const [description, setDescription] = useState(
    "Front-desk operations, scheduling, and document management for a busy team."
  );
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setJob(null);
    try {
      const r = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setJob(d.job);
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

  return (
    <Shell>
      <span className="eyebrow">For employers</span>
      <h1 style={{ fontSize: 34, fontWeight: 800, margin: "10px 0 6px" }}>Post a role</h1>
      <p style={{ color: "var(--slate)", maxWidth: 640 }}>
        Create a job and the AI drafts scenario questions + a scoring rubric for it automatically.
      </p>

      <form onSubmit={submit} className="card" style={{ maxWidth: 640, marginTop: 24 }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Role title</label>
        <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginTop: 16 }}>Description</label>
        <textarea style={{ ...input, minHeight: 90 }} value={description} onChange={(e) => setDescription(e.target.value)} />
        <button className="btn btn-primary" disabled={loading} style={{ marginTop: 18 }}>
          {loading ? "Generating…" : "Create role + generate screening →"}
        </button>
        {error && <p style={{ color: "var(--crit)", marginTop: 10 }}>{error}</p>}
      </form>

      {job && (
        <div className="card" style={{ maxWidth: 640, marginTop: 22 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>{job.title} — screening ready</h3>
          <p style={{ color: "var(--slate)", fontSize: 14, marginTop: 4 }}>AI-generated scenario questions:</p>
          <ol style={{ color: "var(--slate)", fontSize: 14, lineHeight: 1.6, marginTop: 8 }}>
            {job.questions.map((q: string, i: number) => (
              <li key={i} style={{ marginBottom: 6 }}>{q}</li>
            ))}
          </ol>
          <a className="btn btn-primary" href={`/apply/${job.id}`} style={{ marginTop: 8 }}>
            Open the candidate application →
          </a>
        </div>
      )}
    </Shell>
  );
}
