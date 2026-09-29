export default function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  return res.status(200).json({
    workflows: [
      { id: "wf1", name: "Receivables escalation", trigger: "High severity receivables alert", action: "Notify finance lead + create CRM task", status: "active" },
      { id: "wf2", name: "Pipeline quality review", trigger: "Qualified pipeline lag", action: "Open sales ops checklist", status: "active" },
      { id: "wf3", name: "Churn watch", trigger: "Churn rate anomaly", action: "Alert CS manager", status: "draft" },
    ],
  });
}
