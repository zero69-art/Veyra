import { listRuns } from "./lib/core";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 20));
  return res.status(200).json({ runs: listRuns(limit) });
}
