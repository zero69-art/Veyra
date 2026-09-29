import { bodyOf } from "../lib/http";
import { listAlerts, updateAlert } from "../lib/core";

export default function handler(req: any, res: any) {
  if (req.method === "GET") {
    const status = typeof req.query?.status === "string" ? req.query.status : "all";
    return res.status(200).json({ alerts: listAlerts(status) });
  }
  if (req.method === "PATCH" || req.method === "POST") {
    const body = bodyOf(req);
    const id = String(body.id || "");
    const status = String(body.status || "") as "open" | "acknowledged" | "resolved";
    if (!id || !["open", "acknowledged", "resolved"].includes(status)) {
      return res.status(400).json({ error: "id_and_status_required" });
    }
    const alert = updateAlert(id, status);
    if (!alert) return res.status(404).json({ error: "not_found" });
    return res.status(200).json({ alert });
  }
  return res.status(405).json({ error: "method_not_allowed" });
}
