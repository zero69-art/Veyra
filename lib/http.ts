export function bodyOf(req: { body?: unknown }): Record<string, unknown> {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body as Record<string, unknown>;
  try {
    return JSON.parse(req.body || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function json(res: { status: (c: number) => { json: (b: unknown) => unknown } }, status: number, body: unknown) {
  return res.status(status).json(body);
}

export function methodNotAllowed(res: { status: (c: number) => { json: (b: unknown) => unknown } }) {
  return json(res, 405, { error: "method_not_allowed" });
}

export function requireApiKey(req: { headers?: Record<string, string | string | undefined> }, res: { status: (c: number) => { json: (b: unknown) => unknown } }) {
  const required = process.env.VEYRA_API_KEY;
  if (!required) return true;
  const auth = req.headers?.authorization || req.headers?.Authorization;
  const value = Array.isArray(auth) ? auth[0] : auth;
  if (value !== `Bearer ${required}`) {
    json(res, 401, { error: "unauthorized" });
    return false;
  }
  return true;
}
