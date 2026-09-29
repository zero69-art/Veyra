export default function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  return res.status(200).json({ organization: { id: "org_veyra_demo", name: "Northstar Commerce", slug: "northstar", plan: "pilot", createdAt: new Date().toISOString() } });
}
