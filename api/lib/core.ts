import {
  Alert, Anomaly, BriefItem, DailyBrief, DataSource, ForecastOutcome,
  IntelligenceRun, MetricSeries, Organization, Severity,
} from "./types";

const MODEL_VERSION = "baseline-2";
const g = globalThis as unknown as { __veyraStore?: Store };

type Store = {
  org: Organization; sources: DataSource[]; series: MetricSeries[];
  runs: IntelligenceRun[]; alerts: Alert[]; outcomes: ForecastOutcome[];
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function daysAgo(n: number): string {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10);
}
function mean(v: number[]) { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function stdev(v: number[]) {
  if (v.length < 2) return 0;
  const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}
function trend(v: number[]) { return v.length < 2 ? 0 : (v[v.length - 1] - v[0]) / Math.max(1, v.length - 1); }
function finite(values: unknown[]) {
  return values.filter((x): x is number => typeof x === "number" && Number.isFinite(x)).slice(-90);
}
function seriesFrom(base: number, days: number, drift: number, noise: number, spikeAt?: number) {
  const pts = []; let v = base;
  for (let i = days - 1; i >= 0; i--) {
    v = v * (1 + drift) + (Math.sin(i / 3) * noise) / 2;
    if (spikeAt !== undefined && i === spikeAt) v *= 1.22;
    pts.push({ date: daysAgo(i), value: Number(Math.max(0, v).toFixed(2)) });
  }
  return pts;
}
export function detectAnomalies(values: number[]): Anomaly[] {
  if (values.length < 5) return [];
  const m = mean(values), s = stdev(values) || 1, out: Anomaly[] = [];
  values.forEach((value, index) => {
    const z = Math.abs((value - m) / s);
    if (z >= 2) {
      const severity: Severity = z >= 3 ? "High" : z >= 2.5 ? "Medium" : "Low";
      out.push({ index, value, expected: Number(m.toFixed(4)), zScore: Number(z.toFixed(2)), severity,
        message: `Point ${index + 1} is ${z.toFixed(1)} sigma from mean (${value} vs ~${m.toFixed(1)})` });
    }
  });
  return out;
}
export function forecastSeries(values: number[], horizonDays: number) {
  const clean = finite(values);
  if (clean.length < 2) throw new Error("at_least_two_numeric_values_required");
  const horizon = Math.max(1, Math.min(365, Math.floor(horizonDays) || 30));
  const m = mean(clean), t = trend(clean), projected = m + t * horizon;
  const anomalies = detectAnomalies(clean);
  const confidence = Math.max(0.4, Math.min(0.92, 0.5 + Math.min(0.35, clean.length / 180)
    - anomalies.filter((a) => a.severity === "High").length * 0.05));
  const changePct = clean[0] !== 0 ? ((clean[clean.length - 1] - clean[0]) / Math.abs(clean[0])) * 100 : 0;
  const narrative: string[] = [];
  if (t > 0) narrative.push(`Upward trend of ~${t.toFixed(2)} per period.`);
  else if (t < 0) narrative.push(`Downward trend of ~${Math.abs(t).toFixed(2)} per period.`);
  else narrative.push("Series is roughly flat.");
  narrative.push(`Projected in ${horizon}d: ${projected.toFixed(2)} (${(confidence * 100).toFixed(0)}% confidence).`);
  if (anomalies.length) narrative.push(`${anomalies.length} anomalies detected.`);
  if (Math.abs(changePct) >= 5) narrative.push(`Net change: ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%.`);
  return { modelVersion: MODEL_VERSION, method: "deterministic_baseline_v2", horizonDays: horizon,
    mean: Number(m.toFixed(4)), trend: Number(t.toFixed(6)), forecast: Number(projected.toFixed(4)),
    confidence: Number(confidence.toFixed(2)), anomalies, narrative, observations: clean.length, values: clean };
}
function pctChange(series: MetricSeries) {
  const p = series.points; if (p.length < 2 || p[0].value === 0) return 0;
  return ((p[p.length - 1].value - p[0].value) / Math.abs(p[0].value)) * 100;
}
export function buildDailyBrief(orgId: string, series: MetricSeries[]): DailyBrief {
  const items: BriefItem[] = [], attention: string[] = [];
  const metrics = series.map((s) => {
    const change = pctChange(s), last = s.points[s.points.length - 1]?.value ?? 0;
    const values = s.points.map((p) => p.value), anomalies = detectAnomalies(values), t = trend(values);
    if (Math.abs(change) >= 8) items.push({ kind: change >= 0 ? "movement" : "risk",
      severity: Math.abs(change) >= 15 ? "High" : "Medium",
      text: `${s.name} ${change >= 0 ? "increased" : "decreased"} ${Math.abs(change).toFixed(1)}% over the window.` });
    if (anomalies.some((a) => a.severity === "High" || a.severity === "Medium")) {
      const top = [...anomalies].sort((a, b) => b.zScore - a.zScore)[0];
      items.push({ kind: "anomaly", severity: top.severity, text: `Anomaly on ${s.name}: ${top.message}` });
      attention.push(`Investigate ${s.name} anomaly (${top.severity})`);
    }
    if (s.name.toLowerCase().includes("pipeline") && t > 0 && change < 5) {
      items.push({ kind: "risk", severity: "Medium", text: "Pipeline volume rising but qualified growth lags." });
      attention.push("Review pipeline quality vs volume");
    }
    if (s.name.toLowerCase().includes("receivable") || s.name.toLowerCase().includes("concentration")) {
      items.push({ kind: "risk", severity: "High", text: `Customer concentration pressure on ${s.name}.` });
      attention.push("Reduce receivables concentration risk");
    }
    const format = s.unit === "gbp" ? `£${last >= 1000 ? (last / 1000).toFixed(1) + "k" : last.toFixed(0)}`
      : s.unit === "count" ? String(Math.round(last)) : last.toFixed(1);
    return { name: s.name, value: format, change: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`, positive: change >= 0 };
  });
  if (!items.length) items.push({ kind: "insight", text: "No material movements outside baseline bands." });
  const risks = items.filter((i) => i.kind === "risk" || i.kind === "anomaly").length;
  const headline = risks >= 2 ? "Multiple areas require attention today."
    : risks === 1 ? "One priority risk needs review."
    : "Operations within expected bands; monitor concentration and pipeline quality.";
  if (!attention.length) attention.push("No critical actions — continue monitoring.");
  return { organizationId: orgId, generatedAt: new Date().toISOString(), headline, items,
    attention: [...new Set(attention)].slice(0, 5), metrics };
}
function seed(): Store {
  const orgId = "org_veyra_demo";
  const org: Organization = { id: orgId, name: "Northstar Commerce", slug: "northstar", plan: "pilot", createdAt: new Date().toISOString() };
  const sources: DataSource[] = [
    { id: "src_stripe", organizationId: orgId, provider: "Stripe", name: "Stripe Finance", status: "connected", lastSyncedAt: new Date(Date.now() - 120000).toISOString(), records: 18420 },
    { id: "src_sfdc", organizationId: orgId, provider: "Salesforce", name: "Salesforce CRM", status: "connected", lastSyncedAt: new Date(Date.now() - 480000).toISOString(), records: 9321 },
    { id: "src_shop", organizationId: orgId, provider: "Shopify", name: "Shopify Store", status: "connected", lastSyncedAt: new Date(Date.now() - 840000).toISOString(), records: 22104 },
    { id: "src_ga", organizationId: orgId, provider: "Google Analytics", name: "Website Analytics", status: "degraded", lastSyncedAt: new Date(Date.now() - 10800000).toISOString(), records: 550012 },
  ];
  const series: MetricSeries[] = [
    { id: "m_revenue", organizationId: orgId, name: "Revenue", unit: "gbp", source: "Stripe", points: seriesFrom(98000, 30, 0.0028, 1200, 5), updatedAt: new Date().toISOString() },
    { id: "m_cash", organizationId: orgId, name: "Cash", unit: "gbp", source: "Stripe", points: seriesFrom(1650000, 30, 0.001, 8000), updatedAt: new Date().toISOString() },
    { id: "m_pipeline", organizationId: orgId, name: "Pipeline", unit: "gbp", source: "Salesforce", points: seriesFrom(1100000, 30, 0.005, 15000), updatedAt: new Date().toISOString() },
    { id: "m_qualified", organizationId: orgId, name: "Qualified Pipeline", unit: "gbp", source: "Salesforce", points: seriesFrom(420000, 30, 0.0012, 4000), updatedAt: new Date().toISOString() },
    { id: "m_churn", organizationId: orgId, name: "Churn Rate", unit: "pct", source: "Internal", points: seriesFrom(2.1, 30, 0.004, 0.05, 3), updatedAt: new Date().toISOString() },
    { id: "m_receivables", organizationId: orgId, name: "Receivables Concentration", unit: "pct", source: "Finance", points: seriesFrom(28, 30, 0.006, 0.4, 2), updatedAt: new Date().toISOString() },
  ];
  const alerts: Alert[] = [
    { id: uuid(), organizationId: orgId, severity: "High", title: "Receivables concentration increased", detail: "Top two enterprise accounts now represent a larger share of open receivables.", status: "open", metric: "Receivables Concentration", createdAt: new Date(Date.now() - 720000).toISOString() },
    { id: uuid(), organizationId: orgId, severity: "Medium", title: "Revenue trend changed", detail: "Recent observations diverge from the previous baseline band.", status: "open", metric: "Revenue", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: uuid(), organizationId: orgId, severity: "Medium", title: "Pipeline quality lag", detail: "Headline pipeline up strongly; qualified pipeline growth is weaker.", status: "open", metric: "Qualified Pipeline", createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: uuid(), organizationId: orgId, severity: "Low", title: "Data connector healthy", detail: "Stripe, Salesforce and Shopify synced successfully.", status: "resolved", createdAt: new Date(Date.now() - 10800000).toISOString(), resolvedAt: new Date(Date.now() - 9000000).toISOString() },
  ];
  return { org, sources, series, runs: [], alerts, outcomes: [] };
}
export function getStore(): Store { if (!g.__veyraStore) g.__veyraStore = seed(); return g.__veyraStore; }
export function listSeries(orgId?: string) { return getStore().series.filter((x) => !orgId || x.organizationId === orgId); }
export function getSeriesByName(name: string) {
  return getStore().series.find((s) => s.name.toLowerCase() === name.toLowerCase() || s.id === name);
}
export function ingestMetric(input: { name: string; unit?: string; source?: string; values: number[]; organizationId?: string }) {
  const store = getStore(), orgId = input.organizationId || store.org.id;
  const values = input.values.filter((v) => Number.isFinite(v)).slice(-90);
  if (values.length < 1) throw new Error("values_required");
  let series = store.series.find((s) => s.name.toLowerCase() === input.name.toLowerCase() && s.organizationId === orgId);
  const points = values.map((value, i) => ({ date: daysAgo(values.length - 1 - i), value }));
  if (!series) {
    series = { id: `m_${uuid().slice(0, 8)}`, organizationId: orgId, name: input.name.slice(0, 80),
      unit: input.unit || "number", source: input.source || "API", points, updatedAt: new Date().toISOString() };
    store.series.push(series);
  } else { series.points = points; series.updatedAt = new Date().toISOString(); if (input.source) series.source = input.source; }
  return series;
}
export function runIntelligence(input: { metric?: string; horizonDays?: number; values?: number[]; organizationId?: string }) {
  const store = getStore(), orgId = input.organizationId || store.org.id;
  let values = input.values;
  if (!values || values.length < 2) {
    const series = getSeriesByName(input.metric || "Revenue");
    if (!series || series.points.length < 2) throw new Error("at_least_two_numeric_values_required");
    values = series.points.map((p) => p.value);
  }
  const result = forecastSeries(values, input.horizonDays ?? 30);
  const run: IntelligenceRun = {
    id: uuid(), organizationId: orgId, metric: String(input.metric || "metric").slice(0, 100),
    horizonDays: result.horizonDays, modelVersion: result.modelVersion, method: result.method,
    inputSnapshot: { values: result.values, observations: result.observations },
    output: { forecast: result.forecast, confidence: result.confidence, trend: result.trend, mean: result.mean,
      anomalies: result.anomalies, narrative: result.narrative },
    createdAt: new Date().toISOString(),
  };
  store.runs.unshift(run); store.runs = store.runs.slice(0, 100);
  store.outcomes.unshift({ id: uuid(), runId: run.id, predicted: result.forecast });
  for (const a of result.anomalies.filter((x) => x.severity === "High" || x.severity === "Medium")) {
    store.alerts.unshift({ id: uuid(), organizationId: orgId, severity: a.severity, title: `Anomaly on ${run.metric}`,
      detail: a.message, status: "open", metric: run.metric, createdAt: new Date().toISOString() });
  }
  store.alerts = store.alerts.slice(0, 50);
  return run;
}
export function listAlerts(status?: string) {
  const alerts = getStore().alerts;
  return !status || status === "all" ? alerts : alerts.filter((a) => a.status === status);
}
export function updateAlert(id: string, status: "open" | "acknowledged" | "resolved") {
  const alert = getStore().alerts.find((a) => a.id === id);
  if (!alert) return null;
  alert.status = status;
  if (status === "resolved") alert.resolvedAt = new Date().toISOString();
  return alert;
}
export function listRuns(limit = 20) { return getStore().runs.slice(0, limit); }
export function listSources() { return getStore().sources; }
export function getOrg() { return getStore().org; }
export function getBrief() { const s = getStore(); return buildDailyBrief(s.org.id, s.series); }
export function getDashboard() {
  const store = getStore(), brief = buildDailyBrief(store.org.id, store.series);
  return {
    organization: store.org, brief, sources: store.sources,
    series: store.series.map((s) => ({ id: s.id, name: s.name, unit: s.unit, source: s.source,
      latest: s.points[s.points.length - 1]?.value ?? 0, points: s.points, updatedAt: s.updatedAt })),
    alerts: store.alerts.filter((a) => a.status === "open").slice(0, 10),
    runs: store.runs.slice(0, 10),
  };
}
