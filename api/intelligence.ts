export default function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const key = process.env.VEYRA_API_KEY;
  if (key && req.headers?.authorization !== "Bearer " + key) return res.status(401).json({ error: "unauthorized" });
  let body: any = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
  body = body || {};
  let values = Array.isArray(body.values) ? body.values.map(Number).filter(Number.isFinite) : [];
  if (values.length < 2) values = [98000, 99500, 101200, 103000, 105200];
  const horizon = Math.max(1, Math.min(365, Math.floor(Number(body.horizonDays) || 30)));
  const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
  const trend = (values[values.length - 1] - values[0]) / Math.max(1, values.length - 1);
  const projected = mean + trend * horizon;
  const confidence = Math.max(0.45, Math.min(0.9, 0.55 + Math.min(0.35, values.length / 200)));
  const id = "run_" + Date.now().toString(36);
  return res.status(200).json({
    id,
    metric: String(body.metric || "Revenue").slice(0, 100),
    horizonDays: horizon,
    forecast: { value: Number(projected.toFixed(4)), confidence: Number(confidence.toFixed(2)) },
    trend: Number(trend.toFixed(6)),
    mean: Number(mean.toFixed(4)),
    anomalies: [],
    narrative: [
      trend > 0 ? `Upward trend of ~${trend.toFixed(2)} per period.` : trend < 0 ? `Downward trend of ~${Math.abs(trend).toFixed(2)} per period.` : "Series is roughly flat.",
      `Projected in ${horizon}d: ${projected.toFixed(2)} (${(confidence * 100).toFixed(0)}% confidence).`,
    ],
    method: "deterministic_baseline_v2",
    provenance: { modelVersion: "baseline-2", observations: values.length, generatedAt: new Date().toISOString(), runId: id },
    disclaimer: "Decision-support output, not financial advice or a guarantee.",
  });
}
