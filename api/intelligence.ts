function bodyOf(req: any): any {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}
function finite(values: unknown[]): number[] {
  return (values || []).filter((v): v is number => typeof v === "number" && Number.isFinite(v)).slice(-90);
}
export default function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const required = process.env.VEYRA_API_KEY;
  if (required && req.headers?.authorization !== "Bearer " + required) return res.status(401).json({ error: "unauthorized" });
  try {
    const body = bodyOf(req);
    let values = finite(Array.isArray(body.values) ? body.values : []);
    if (values.length < 2) values = [98000, 99500, 101200, 103000, 105200];
    const horizon = Math.max(1, Math.min(365, Math.floor(Number(body.horizonDays) || 30)));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const trend = (values[values.length - 1] - values[0]) / Math.max(1, values.length - 1);
    const projected = mean + trend * horizon;
    const m = mean, s = Math.sqrt(values.reduce((acc, x) => acc + (x - m) ** 2, 0) / Math.max(1, values.length - 1)) || 1;
    const anomalies = values.map((value, index) => {
      const z = Math.abs((value - m) / s);
      if (z < 2) return null;
      return { index, value, expected: Number(m.toFixed(2)), zScore: Number(z.toFixed(2)), severity: z >= 3 ? "High" : z >= 2.5 ? "Medium" : "Low", message: `Point ${index + 1} is ${z.toFixed(1)} sigma from mean` };
    }).filter(Boolean);
    const confidence = Math.max(0.45, Math.min(0.9, 0.55 + Math.min(0.35, values.length / 200)));
    const narrative = [
      trend > 0 ? `Upward trend of ~${trend.toFixed(2)} per period.` : trend < 0 ? `Downward trend of ~${Math.abs(trend).toFixed(2)} per period.` : "Series is roughly flat.",
      `Projected in ${horizon}d: ${projected.toFixed(2)} (${(confidence * 100).toFixed(0)}% confidence).`,
    ];
    if (anomalies.length) narrative.push(`${anomalies.length} anomalies detected.`);
    const id = "run_" + Date.now().toString(36);
    return res.status(200).json({
      id,
      metric: String(body.metric || "Revenue").slice(0, 100),
      horizonDays: horizon,
      forecast: { value: Number(projected.toFixed(4)), confidence: Number(confidence.toFixed(2)) },
      trend: Number(trend.toFixed(6)),
      mean: Number(mean.toFixed(4)),
      anomalies,
      narrative,
      method: "deterministic_baseline_v2",
      provenance: { modelVersion: "baseline-2", observations: values.length, generatedAt: new Date().toISOString(), runId: id },
      disclaimer: "Decision-support output, not financial advice or a guarantee.",
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "intelligence_failed" });
  }
}
