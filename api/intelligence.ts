import { runIntelligence } from "./_lib/store.js";
function bodyOf(req: any) {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}
export default function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const key = process.env.VEYRA_API_KEY;
  if (key && req.headers?.authorization !== "Bearer " + key) return res.status(401).json({ error: "unauthorized" });
  try {
    const body = bodyOf(req);
    const values = Array.isArray(body.values) ? body.values.map(Number).filter(Number.isFinite) : undefined;
    const run = runIntelligence({
      metric: body.metric ? String(body.metric) : "Revenue",
      horizonDays: body.horizonDays !== undefined ? Number(body.horizonDays) : 30,
      values,
    });
    return res.status(200).json({
      id: run.id,
      metric: run.metric,
      horizonDays: run.horizonDays,
      forecast: { value: run.output.forecast, confidence: run.output.confidence },
      trend: run.output.trend,
      mean: run.output.mean,
      anomalies: run.output.anomalies,
      narrative: run.output.narrative,
      method: run.method,
      provenance: {
        modelVersion: run.modelVersion,
        observations: run.inputSnapshot.observations,
        generatedAt: run.createdAt,
        runId: run.id,
      },
      disclaimer: "Decision-support output, not financial advice or a guarantee.",
    });
  } catch (e: any) {
    const msg = e?.message || "intelligence_failed";
    return res.status(msg === "at_least_two_numeric_values_required" ? 400 : 500).json({ error: msg });
  }
}
