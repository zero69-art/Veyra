export function bodyOf(req: { body?: unknown }): Record<string, unknown> {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body as Record<string, unknown>;
  try {
    return JSON.parse(req.body || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function requireApiKey(req: { headers?: Record<string, string | undefined> }, res: { status: (c: number) => { json: (b: unknown) => unknown } }) {
  const required = process.env.VEYRA_API_KEY;
  if (!required) return true;
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (auth !== `Bearer ${required}`) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}
