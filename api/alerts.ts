const alerts = [
  { id: "a1", severity: "High", title: "Receivables concentration increased", detail: "Top two enterprise accounts now represent a larger share of open receivables.", status: "open", metric: "Receivables Concentration", createdAt: new Date(Date.now() - 720000).toISOString() },
  { id: "a2", severity: "Medium", title: "Revenue trend changed", detail: "Recent observations diverge from the previous baseline band.", status: "open", metric: "Revenue", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "a3", severity: "Medium", title: "Pipeline quality lag", detail: "Headline pipeline up strongly; qualified pipeline growth is weaker.", status: "open", metric: "Qualified Pipeline", createdAt: new Date(Date.now() - 7200000).toISOString() },
];
export default function handler(req: any, res: any) {
  if (req.method === "GET") {
    const status = typeof req.query?.status === "string" ? req.query.status : "all";
    const list = status === "all" ? alerts : alerts.filter((a) => a.status === status);
    return res.status(200).json({ alerts: list });
  }
  if (req.method === "POST" || req.method === "PATCH") {
    let body: any = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
    body = body || {};
    const alert = alerts.find((a) => a.id === body.id);
    if (!alert) return res.status(404).json({ error: "not_found" });
    if (["open", "acknowledged", "resolved"].includes(String(body.status))) alert.status = String(body.status);
    return res.status(200).json({ alert });
  }
  return res.status(405).json({ error: "method_not_allowed" });
}
