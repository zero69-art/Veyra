function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
function seriesFrom(base: number, days: number, drift: number, noise: number, spikeAt?: number) {
  const pts = [];
  let v = base;
  for (let i = days - 1; i >= 0; i--) {
    v = v * (1 + drift) + (Math.sin(i / 3) * noise) / 2;
    if (spikeAt !== undefined && i === spikeAt) v *= 1.22;
    pts.push({ date: daysAgo(i), value: Number(Math.max(0, v).toFixed(2)) });
  }
  return pts;
}
export default function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const series = [
    { id: "m_revenue", name: "Revenue", unit: "gbp", source: "Stripe", points: seriesFrom(98000, 30, 0.0028, 1200, 5) },
    { id: "m_cash", name: "Cash", unit: "gbp", source: "Stripe", points: seriesFrom(1650000, 30, 0.001, 8000) },
    { id: "m_pipeline", name: "Pipeline", unit: "gbp", source: "Salesforce", points: seriesFrom(1100000, 30, 0.005, 15000) },
    { id: "m_qualified", name: "Qualified Pipeline", unit: "gbp", source: "Salesforce", points: seriesFrom(420000, 30, 0.0012, 4000) },
    { id: "m_churn", name: "Churn Rate", unit: "pct", source: "Internal", points: seriesFrom(2.1, 30, 0.004, 0.05, 3) },
    { id: "m_receivables", name: "Receivables Concentration", unit: "pct", source: "Finance", points: seriesFrom(28, 30, 0.006, 0.4, 2) },
  ].map((s) => ({ ...s, latest: s.points[s.points.length - 1].value, updatedAt: new Date().toISOString() }));
  return res.status(200).json({
    organization: { name: "Northstar Commerce", slug: "northstar", plan: "pilot" },
    brief: {
      headline: "Multiple areas require attention today.",
      generatedAt: new Date().toISOString(),
      items: [
        { kind: "risk", severity: "High", text: "Receivables concentration increased over the window." },
        { kind: "movement", severity: "Medium", text: "Revenue increased over the observation window." },
        { kind: "risk", severity: "Medium", text: "Pipeline volume rising but qualified growth lags." },
      ],
      attention: ["Reduce receivables concentration risk", "Review pipeline quality vs volume"],
      metrics: series.slice(0, 4).map((s) => {
        const first = s.points[0].value, last = s.latest;
        const change = first ? ((last - first) / Math.abs(first)) * 100 : 0;
        const value = s.unit === "gbp" ? (last >= 1000 ? `£${(last / 1000).toFixed(1)}k` : `£${last.toFixed(0)}`) : last.toFixed(2);
        return { name: s.name, value, change: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`, positive: change >= 0 };
      }),
    },
    sources: [
      { id: "1", provider: "Stripe", name: "Stripe Finance", status: "connected", lastSyncedAt: new Date(Date.now() - 120000).toISOString(), records: 18420 },
      { id: "2", provider: "Salesforce", name: "Salesforce CRM", status: "connected", lastSyncedAt: new Date(Date.now() - 480000).toISOString(), records: 9321 },
      { id: "3", provider: "Shopify", name: "Shopify Store", status: "connected", lastSyncedAt: new Date(Date.now() - 840000).toISOString(), records: 22104 },
      { id: "4", provider: "Google Analytics", name: "Website Analytics", status: "degraded", lastSyncedAt: new Date(Date.now() - 10800000).toISOString(), records: 550012 },
    ],
    series,
    alerts: [
      { id: "a1", severity: "High", title: "Receivables concentration increased", detail: "Top two enterprise accounts now represent a larger share of open receivables.", status: "open", metric: "Receivables Concentration", createdAt: new Date(Date.now() - 720000).toISOString() },
      { id: "a2", severity: "Medium", title: "Revenue trend changed", detail: "Recent observations diverge from the previous baseline band.", status: "open", metric: "Revenue", createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: "a3", severity: "Medium", title: "Pipeline quality lag", detail: "Headline pipeline up strongly; qualified pipeline growth is weaker.", status: "open", metric: "Qualified Pipeline", createdAt: new Date(Date.now() - 7200000).toISOString() },
    ],
    runs: [],
    workflows: [
      { id: "wf1", name: "Receivables escalation", trigger: "High severity receivables alert", action: "Notify finance lead + create CRM task", status: "active" },
      { id: "wf2", name: "Pipeline quality review", trigger: "Qualified pipeline lag", action: "Open sales ops checklist", status: "active" },
      { id: "wf3", name: "Churn watch", trigger: "Churn rate anomaly", action: "Alert CS manager", status: "draft" },
    ],
  });
}
