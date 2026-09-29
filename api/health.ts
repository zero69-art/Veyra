export default function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  return res.status(200).json({
    status: "ok",
    service: "veyra-api",
    version: "0.3.0",
    product: "Veyra Business Intelligence OS",
    timestamp: new Date().toISOString(),
  });
}
