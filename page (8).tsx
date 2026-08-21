import { Shell, scoreColor } from "../ui";
import { listApplications } from "@/lib/store";
import { AI_LIVE } from "@/lib/ai";
import { DB_LIVE } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const apps = await listApplications();
  const scored = apps.filter((a) => typeof a.score === "number");
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + (a.score || 0), 0) / scored.length) : 0;
  const shortlisted = scored.filter((a) => (a.score || 0) >= 80).length;

  const kpi = (label: string, val: string | number, grad: string) => (
    <div style={{ borderRadius: 14, padding: "16px 18px", color: "#fff", background: grad, minWidth: 150, flex: 1 }}>
      <div style={{ fontSize: 12, opacity: 0.9 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{val}</div>
    </div>
  );

  return (
    <Shell>
      <span className="eyebrow">Employer dashboard</span>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: "10px 0 4px" }}>Ranked candidates</h1>
      <p style={{ color: "var(--slate)" }}>
        Every applicant, scored by AI and sorted best-first.
        {!AI_LIVE && <span style={{ color: "#b45309" }}> (demo scoring — add ANTHROPIC_API_KEY for real Claude)</span>}
        {!DB_LIVE && <span style={{ color: "#b45309" }}> (in-memory — add Supabase keys to persist)</span>}
      </p>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "22px 0 26px" }}>
        {kpi("Applicants", apps.length, "linear-gradient(135deg,#3b82f6,#2a78d6)")}
        {kpi("Scored", scored.length, "linear-gradient(135deg,#22d3ee,#1baf7a)")}
        {kpi("Shortlisted", shortlisted, "linear-gradient(135deg,#7c3aed,#c026d3)")}
        {kpi("Avg score", avg, "linear-gradient(135deg,#f59e0b,#eb6834)")}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {scored.map((a, i) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i ? "1px solid var(--line)" : "none" }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: "#eef2fb", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, color: "#334155" }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{a.candidate_name}</div>
              <div style={{ fontSize: 13, color: "var(--slate)" }}>{a.reason}</div>
            </div>
            <span style={{ fontWeight: 800, fontSize: 13, color: scoreColor(a.score || 0), background: "rgba(0,0,0,.04)", padding: "6px 12px", borderRadius: 999 }}>{a.score}</span>
          </div>
        ))}
        {scored.length === 0 && <div style={{ padding: 20, color: "var(--slate)" }}>No applications yet. Try the candidate demo.</div>}
      </div>

      <a className="btn btn-primary" href="/apply/demo" style={{ marginTop: 22 }}>Add a candidate via the demo →</a>
    </Shell>
  );
}
