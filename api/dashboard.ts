export default function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  return res.status(200).json({
    organization: { name: "Northstar Commerce", slug: "northstar", plan: "pilot" },
    brief: {
      headline: "Multiple areas require attention today.",
      generatedAt: new Date().toISOString(),
      items: [
        { kind: "risk", severity: "High", text: "Receivables concentration increased." },
        { kind: "movement", severity: "Medium", text: "Revenue increased over the observation window." },
        { kind: "risk", severity: "Medium", text: "Pipeline volume rising but qualified growth lags." }
      ],
      attention: ["Reduce receivables concentration risk", "Review pipeline quality vs volume"],
      metrics: [
        { name: "Revenue", value: "£105.2k", change: "+8.4%", positive: true },
        { name: "Cash", value: "£1.72m", change: "+3.1%", positive: true },
        { name: "Pipeline", value: "£1.28m", change: "+17.0%", positive: true },
        { name: "Churn Rate", value: "2.4", change: "+12.0%", positive: false }
      ]
    },
    sources: [
      { id: "1", provider: "Stripe", name: "Stripe Finance", status: "connected", lastSyncedAt: new Date().toISOString(), records: 18420 },
      { id: "2", provider: "Salesforce", name: "Salesforce CRM", status: "connected", lastSyncedAt: new Date().toISOString(), records: 9321 },
      { id: "3", provider: "Shopify", name: "Shopify Store", status: "connected", lastSyncedAt: new Date().toISOString(), records: 22104 },
      { id: "4", provider: "Google Analytics", name: "Website Analytics", status: "degraded", lastSyncedAt: new Date().toISOString(), records: 550012 }
    ],
    series: [
      { id: "m_revenue", name: "Revenue", unit: "gbp", source: "Stripe", latest: 105200, points: [{ date: "2026-09-01", value: 98000 }, { date: "2026-09-15", value: 101000 }, { date: "2026-09-29", value: 105200 }], updatedAt: new Date().toISOString() },
      { id: "m_cash", name: "Cash", unit: "gbp", source: "Stripe", latest: 1720000, points: [{ date: "2026-09-01", value: 1650000 }, { date: "2026-09-29", value: 1720000 }], updatedAt: new Date().toISOString() }
    ],
    alerts: [
      { id: "a1", severity: "High", title: "Receivables concentration increased", detail: "Top two enterprise accounts now represent a larger share of open receivables.", status: "open", createdAt: new Date().toISOString() },
      { id: "a2", severity: "Medium", title: "Pipeline quality lag", detail: "Headline pipeline up strongly; qualified pipeline growth is weaker.", status: "open", createdAt: new Date().toISOString() }
    ],
    runs: []
  });
}
