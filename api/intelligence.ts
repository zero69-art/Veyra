import { bodyOf, requireApiKey } from "./lib/http";
import { runIntelligence } from "./lib/core";

export default function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!requireApiKey(req, res)) return;
  try {
    const body = bodyOf(req);
    const values = Array.isArray(body.values) ? (body.values as unknown[]) : undefined;
    const numeric = values?.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    const run = runIntelligence({
      metric: body.metric ? String(body.metric) : "Revenue",
      horizonDays: body.horizonDays !== undefined ? Number(body.horizonDays) : 30,
      values: numeric,
    });
    return res.status(200).json({
      id: run.id, metric: run.metric, horizonDays: run.horizonDays,
      forecast: { value: run.output.forecast, confidence: run.output.confidence },
      trend: run.output.trend, mean: run.output.mean, anomalies: run.output.anomalies,
      narrative: run.output.narrative, method: run.method,
      provenance: { modelVersion: run.modelVersion, observations: run.inputSnapshot.observations, generatedAt: run.createdAt, runId: run.id },
      disclaimer: "Decision-support output, not financial advice or a guarantee.",
    });
  } catch (e: any) {
    const msg = e?.message || "intelligence_failed";
    return res.status(msg === "at_least_two_numeric_values_required" ? 400 : 500).json({ error: msg });
  }
}
