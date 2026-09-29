export default function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  return res.status(200).json({
    sources: [
      { id: "1", provider: "Stripe", name: "Stripe Finance", status: "connected", lastSyncedAt: new Date(Date.now() - 120000).toISOString(), records: 18420 },
      { id: "2", provider: "Salesforce", name: "Salesforce CRM", status: "connected", lastSyncedAt: new Date(Date.now() - 480000).toISOString(), records: 9321 },
      { id: "3", provider: "Shopify", name: "Shopify Store", status: "connected", lastSyncedAt: new Date(Date.now() - 840000).toISOString(), records: 22104 },
      { id: "4", provider: "Google Analytics", name: "Website Analytics", status: "degraded", lastSyncedAt: new Date(Date.now() - 10800000).toISOString(), records: 550012 },
    ],
  });
}
