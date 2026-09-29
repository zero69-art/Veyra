import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Severity = "High" | "Medium" | "Low";
type Tab = "Overview" | "Intelligence" | "Monitor" | "Forecast" | "Reports" | "Alerts" | "Data" | "Workflows" | "Settings";

type AlertT = { id: string; severity: Severity; title: string; detail: string; status: string; metric?: string; createdAt: string };
type Series = { id: string; name: string; unit: string; source: string; latest: number; points: { date: string; value: number }[] };
type Run = { id: string; metric: string; horizonDays: number; modelVersion: string; method: string; output: { forecast: number; confidence: number; narrative: string[] }; createdAt: string };
type Brief = { headline: string; generatedAt: string; items: { kind: string; text: string; severity?: Severity }[]; attention: string[]; metrics: { name: string; value: string; change: string; positive: boolean }[] };
type Dashboard = {
  organization: { name: string; slug: string; plan: string };
  brief: Brief;
  sources: { id: string; provider: string; name: string; status: string; lastSyncedAt: string; records: number }[];
  series: Series[];
  alerts: AlertT[];
  runs: Run[];
  workflows?: { id: string; name: string; trigger: string; action: string; status: string }[];
};

const TABS: Tab[] = ["Overview", "Intelligence", "Monitor", "Forecast", "Reports", "Alerts", "Data", "Workflows", "Settings"];

function relTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
function fmt(unit: string, value: number) {
  if (unit === "gbp") return value >= 1e6 ? `£${(value / 1e6).toFixed(2)}m` : value >= 1000 ? `£${(value / 1000).toFixed(1)}k` : `£${value.toFixed(0)}`;
  if (unit === "pct") return `${value.toFixed(2)}%`;
  return value.toFixed(1);
}
function Spark({ points }: { points: { value: number }[] }) {
  if (!points?.length) return null;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const d = vals.map((v, i) => `${i ? "L" : "M"}${((i / Math.max(1, vals.length - 1)) * 120).toFixed(1)},${(34 - ((v - min) / span) * 30).toFixed(1)}`).join(" ");
  return <svg className="spark" viewBox="0 0 120 36" width={120} height={36} aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
}

function App() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [status, setStatus] = useState("Checking");
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState("Run intelligence scan");
  const [lastRun, setLastRun] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [metricName, setMetricName] = useState("Revenue");
  const [horizon, setHorizon] = useState(30);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/dashboard");
      if (!r.ok) throw new Error("dashboard_failed");
      const j = await r.json();
      setData(j);
      setStatus("Operational");
      setError(null);
    } catch {
      setStatus("Preview mode");
      setError("Could not load live intelligence.");
    }
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 45000);
    return () => window.clearInterval(t);
  }, [load]);

  async function runIntelligence() {
    if (scan === "Scanning…") return;
    setScan("Scanning…");
    try {
      const r = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metric: metricName, horizonDays: horizon }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "fail");
      setLastRun(j);
      setScan("Scan complete");
      await load();
    } catch {
      setScan("Scan unavailable");
    } finally {
      window.setTimeout(() => setScan("Run intelligence scan"), 1600);
    }
  }

  async function setAlertStatus(id: string, next: string) {
    setBusy(id);
    try {
      await fetch("/api/alerts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status: next }) });
      await load();
    } finally {
      setBusy(null);
    }
  }

  const q = query.toLowerCase();
  const filteredAlerts = useMemo(() => (data?.alerts || []).filter((a) => !q || (a.title + a.detail + a.severity).toLowerCase().includes(q)), [data, q]);
  const brief = data?.brief;
  const orgName = data?.organization.name || "Veyra";

  return (
    <div className="app">
      <aside>
        <div className="brand"><span>V</span><div>VEYRA<small>BUSINESS INTELLIGENCE OS</small></div></div>
        <nav aria-label="Primary">{TABS.map((x) => (
          <button key={x} className={tab === x ? "active" : ""} aria-current={tab === x ? "page" : undefined} onClick={() => setTab(x)}>{x}</button>
        ))}</nav>
        <div className="sidebottom"><div className="statusdot" /><div><b>{status}</b><small>{orgName} · {data?.organization.plan || "pilot"}</small></div></div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">INTELLIGENCE STUDIO</p>
            <h1>{tab}</h1>
            <p className="muted">Connect your business. Veyra understands it. Veyra tells you what matters.</p>
          </div>
          <div className="header-actions">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search intelligence…" aria-label="Search" />
            <button className="primary" onClick={runIntelligence} disabled={scan === "Scanning…"}>{scan}</button>
          </div>
        </header>
        {error && <div className="banner warn">{error}</div>}
        {brief && (
          <section className="metrics">{brief.metrics.slice(0, 4).map((m) => (
            <div className="metric" key={m.name}><span>{m.name}</span><strong>{m.value}</strong><em className={m.positive ? "up" : "down"}>{m.change}</em></div>
          ))}</section>
        )}

        {tab === "Overview" && brief && (
          <>
            <section className="brief panel">
              <div className="panelhead"><div><span className="eyebrow">VEYRA DAILY</span><h2>{brief.headline}</h2></div><small className="muted">{relTime(brief.generatedAt)}</small></div>
              <ul className="brief-list">{brief.items.map((item, i) => (
                <li key={i}>{item.severity && <b className={item.severity.toLowerCase()}>{item.severity}</b>}<span>{item.text}</span></li>
              ))}</ul>
              <div className="attention"><span className="eyebrow">REQUIRES ATTENTION</span><ol>{brief.attention.map((a, i) => <li key={i}>{a}</li>)}</ol></div>
            </section>
            <section className="grid">
              <div className="panel large">
                <div className="panelhead"><div><span className="eyebrow">MONITOR</span><h2>What changed</h2></div><button onClick={load}>Refresh</button></div>
                <div className="series-grid">{(data?.series || []).slice(0, 4).map((s) => (
                  <div className="series-card" key={s.id}><div><strong>{s.name}</strong><small>{s.source}</small></div><div className="series-right"><strong>{fmt(s.unit, s.latest)}</strong><Spark points={s.points} /></div></div>
                ))}</div>
              </div>
              <div className="panel">
                <div className="panelhead"><div><span className="eyebrow">ALERTS</span><h2>Needs attention</h2></div><button onClick={() => setTab("Alerts")}>View all</button></div>
                {(data?.alerts || []).slice(0, 4).map((a) => (
                  <article className="alert" key={a.id}><b className={a.severity.toLowerCase()}>{a.severity}</b><div><strong>{a.title}</strong><p>{a.detail}</p><small>{relTime(a.createdAt)}</small></div></article>
                ))}
              </div>
            </section>
            <section className="connectors panel">
              <div className="panelhead"><div><span className="eyebrow">DATA LAYER</span><h2>Connected sources</h2></div><button onClick={() => setTab("Data")}>Manage</button></div>
              <div className="connector-row">{(data?.sources || []).map((s) => (
                <div className="connector" key={s.id}><span className="logo">{s.provider[0]}</span><div><strong>{s.name}</strong><small>{s.status} · {relTime(s.lastSyncedAt)} · {s.records.toLocaleString()} records</small></div><b className={s.status}>{s.status}</b></div>
              ))}</div>
            </section>
          </>
        )}

        {(tab === "Intelligence" || tab === "Forecast") && (
          <section className="panel pagepanel">
            <div className="panelhead"><div><span className="eyebrow">{tab === "Forecast" ? "FORECAST" : "INTELLIGENCE ENGINE"}</span><h2>{tab === "Forecast" ? "Projections with provenance" : "Run analysis"}</h2></div></div>
            <div className="form-row">
              <label>Metric<select value={metricName} onChange={(e) => setMetricName(e.target.value)}>{(data?.series || [{ name: "Revenue" }]).map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}</select></label>
              <label>Horizon (days)<input type="number" min={1} max={365} value={horizon} onChange={(e) => setHorizon(Number(e.target.value) || 30)} /></label>
              <button className="primary" onClick={runIntelligence}>{scan}</button>
            </div>
            {lastRun && (
              <div className="result" role="status">
                <div>
                  <span className="eyebrow">LIVE RUN</span>
                  <h2>{lastRun.metric}: {lastRun.forecast?.value}</h2>
                  <p>{lastRun.horizonDays}d · {Math.round((lastRun.forecast?.confidence || 0) * 100)}% · {lastRun.provenance?.modelVersion}</p>
                  <ul className="narrative">{(lastRun.narrative || []).map((n: string, i: number) => <li key={i}>{n}</li>)}</ul>
                </div>
              </div>
            )}
            {(data?.runs || []).map((r) => (
              <article className="passport" key={r.id}>
                <span className="eyebrow">INTELLIGENCE PASSPORT</span>
                <h3>{r.metric} → {r.output.forecast}</h3>
                <p>Model {r.modelVersion} · {r.method} · {(r.output.confidence * 100).toFixed(0)}% · {r.horizonDays}d</p>
                <p className="muted">{relTime(r.createdAt)} · outcome evaluation pending</p>
              </article>
            ))}
            {!data?.runs?.length && !lastRun && <p className="muted">No runs yet — execute a scan to build intelligence memory.</p>}
          </section>
        )}

        {tab === "Monitor" && (
          <section className="panel pagepanel">
            <div className="panelhead"><div><span className="eyebrow">CONTINUOUS MONITORING</span><h2>Live metric board</h2></div><button onClick={load}>Refresh</button></div>
            <div className="monitor-grid">{(data?.series || []).map((s) => (
              <div className="monitor-card" key={s.id}><div className="panelhead"><div><strong>{s.name}</strong><small className="muted">{s.source}</small></div><strong>{fmt(s.unit, s.latest)}</strong></div><Spark points={s.points} /><small className="muted">{s.points.length} observations</small></div>
            ))}</div>
          </section>
        )}

        {tab === "Reports" && brief && (
          <section className="panel pagepanel">
            <div className="panelhead"><div><span className="eyebrow">REPORTS</span><h2>CEO daily brief</h2></div><button onClick={() => window.print()}>Print</button></div>
            <article className="report">
              <h3>{orgName} — Veyra Daily</h3>
              <p className="muted">{new Date(brief.generatedAt).toLocaleString()}</p>
              <p><strong>{brief.headline}</strong></p>
              <h4>Key movements</h4><ul>{brief.items.map((i, idx) => <li key={idx}>{i.text}</li>)}</ul>
              <h4>Actions</h4><ol>{brief.attention.map((a, idx) => <li key={idx}>{a}</li>)}</ol>
              <table><thead><tr><th>Metric</th><th>Value</th><th>Change</th></tr></thead>
              <tbody>{brief.metrics.map((m) => <tr key={m.name}><td>{m.name}</td><td>{m.value}</td><td>{m.change}</td></tr>)}</tbody></table>
            </article>
          </section>
        )}

        {tab === "Alerts" && (
          <section className="panel pagepanel">
            <div className="panelhead"><div><span className="eyebrow">ALERTS</span><h2>Open and recent</h2></div><span className="muted">{filteredAlerts.length} shown</span></div>
            {filteredAlerts.map((a) => (
              <article className="alert row" key={a.id}>
                <b className={a.severity.toLowerCase()}>{a.severity}</b>
                <div><strong>{a.title}</strong><p>{a.detail}</p><small>{relTime(a.createdAt)} · {a.status}{a.metric ? ` · ${a.metric}` : ""}</small></div>
                {a.status === "open" && (
                  <div className="alert-actions">
                    <button disabled={busy === a.id} onClick={() => setAlertStatus(a.id, "acknowledged")}>Ack</button>
                    <button disabled={busy === a.id} onClick={() => setAlertStatus(a.id, "resolved")}>Resolve</button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {tab === "Data" && (
          <section className="panel pagepanel">
            <div className="panelhead"><div><span className="eyebrow">DATA LAYER</span><h2>Sources & series</h2></div></div>
            <h3>Connectors</h3>
            {(data?.sources || []).map((s) => (
              <div className="connector full" key={s.id}><span className="logo">{s.provider[0]}</span><div><strong>{s.name}</strong><small>{s.provider} · {s.records.toLocaleString()} records · {relTime(s.lastSyncedAt)}</small></div><b className={s.status}>{s.status}</b></div>
            ))}
            <h3>Metric series</h3>
            {(data?.series || []).map((s) => (
              <div className="series-card full" key={s.id}><div><strong>{s.name}</strong><small>{s.source} · {s.unit} · {s.points.length} points</small></div><div className="series-right"><strong>{fmt(s.unit, s.latest)}</strong><Spark points={s.points} /></div></div>
            ))}
          </section>
        )}

        {tab === "Workflows" && (
          <section className="panel pagepanel">
            <div className="panelhead"><div><span className="eyebrow">WORKFLOWS</span><h2>From insight to action</h2></div></div>
            <div className="workflow">
              {(data?.workflows || []).map((w) => (
                <div className="step" key={w.id}><span>{w.status === "active" ? "●" : "○"}</span><div><strong>{w.name}</strong><p>{w.trigger} → {w.action}</p><small className="muted">{w.status}</small></div></div>
              ))}
            </div>
          </section>
        )}

        {tab === "Settings" && (
          <section className="panel pagepanel">
            <div className="panelhead"><div><span className="eyebrow">SETTINGS</span><h2>Organization</h2></div></div>
            <dl className="settings">
              <div><dt>Organization</dt><dd>{data?.organization.name}</dd></div>
              <div><dt>Slug</dt><dd>{data?.organization.slug}</dd></div>
              <div><dt>Plan</dt><dd>{data?.organization.plan}</dd></div>
              <div><dt>API</dt><dd>/api/health · /api/dashboard · /api/intelligence · /api/metrics · /api/alerts · /api/runs · /api/workflows</dd></div>
              <div><dt>Version</dt><dd>Veyra 1.0.0 — Business Intelligence OS</dd></div>
            </dl>
          </section>
        )}

        <footer>Veyra Intelligence OS · v1.0.0 · Decision support, not financial advice.</footer>
      </main>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");
createRoot(rootEl).render(<App />);
