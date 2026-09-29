export default function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({ metrics: [{ id: "m_revenue", name: "Revenue", unit: "gbp", source: "Stripe" }] });
  }
  if (req.method === "POST") {
    return res.status(201).json({ metric: { name: "Custom", status: "accepted" } });
  }
  return res.status(405).json({ error: "method_not_allowed" });
}
