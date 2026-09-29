export default function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  return res.status(200).json({
    organizationId: "org_veyra_demo",
    generatedAt: new Date().toISOString(),
    headline: "Multiple areas require attention today.",
    items: [
      { kind: "risk", severity: "High", text: "Receivables concentration increased." },
      { kind: "movement", severity: "Medium", text: "Revenue increased over the observation window." },
      { kind: "risk", severity: "Medium", text: "Pipeline volume rising but qualified growth lags." },
    ],
    attention: ["Reduce receivables concentration risk", "Review pipeline quality vs volume"],
    metrics: [
      { name: "Revenue", value: "£105.2k", change: "+8.4%", positive: true },
      { name: "Cash", value: "£1.72m", change: "+3.1%", positive: true },
      { name: "Pipeline", value: "£1.28m", change: "+17.0%", positive: true },
      { name: "Churn Rate", value: "2.4%", change: "+12.0%", positive: false },
    ],
  });
}
