import { bodyOf, requireApiKey } from "../lib/http";
import { ingestMetric, listSeries } from "../lib/store";

export default function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({ metrics: listSeries() });
  }
  if (req.method === "POST") {
    if (!requireApiKey(req, res)) return;
    try {
      const body = bodyOf(req);
      const values = Array.isArray(body.values)
        ? (body.values as unknown[]).map((v) => Number(v)).filter((v) => Number.isFinite(v))
        : [];
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
