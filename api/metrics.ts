import { ingestMetric, listSeries } from "./_lib/store.js";
function bodyOf(req: any) {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}
export default function handler(req: any, res: any) {
  if (req.method === "GET") return res.status(200).json({ metrics: listSeries() });
  if (req.method === "POST") {
    const key = process.env.VEYRA_API_KEY;
    if (key && req.headers?.authorization !== "Bearer " + key) return res.status(401).json({ error: "unauthorized" });
    try {
      const body = bodyOf(req);
      const values = Array.isArray(body.values) ? body.values.map(Number).filter(Number.isFinite) : [];
      const series = ingestMetric({
        name: String(body.name || body.metric || "Custom Metric"),
        unit: body.unit ? String(body.unit) : undefined,
        source: body.source ? String(body.source) : undefined,
        values,
      });
      return res.status(201).json({ metric: series });
    } catch (e: any) {
      return res.status(400).json({ error: e?.message || "ingest_failed" });
    }
  }
  return res.status(405).json({ error: "method_not_allowed" });
}
