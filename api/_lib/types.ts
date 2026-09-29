export type Severity = "High" | "Medium" | "Low";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export interface Organization { id: string; name: string; slug: string; plan: string; createdAt: string; }
export interface MetricPoint { date: string; value: number; }
export interface MetricSeries { id: string; organizationId: string; name: string; unit: string; source: string; points: MetricPoint[]; updatedAt: string; }
export interface DataSource { id: string; organizationId: string; provider: string; name: string; status: "connected" | "degraded" | "disconnected"; lastSyncedAt: string; records: number; }
export interface Anomaly { index: number; value: number; expected: number; zScore: number; severity: Severity; message: string; }
export interface IntelligenceRun { id: string; organizationId: string; metric: string; horizonDays: number; modelVersion: string; method: string; inputSnapshot: { values: number[]; observations: number }; output: { forecast: number; confidence: number; trend: number; mean: number; anomalies: Anomaly[]; narrative: string[]; }; createdAt: string; }
export interface Alert { id: string; organizationId: string; severity: Severity; title: string; detail: string; status: AlertStatus; metric?: string; createdAt: string; resolvedAt?: string; }
export interface BriefItem { kind: "insight" | "risk" | "opportunity" | "anomaly" | "movement"; text: string; severity?: Severity; }
export interface DailyBrief { organizationId: string; generatedAt: string; headline: string; items: BriefItem[]; attention: string[]; metrics: { name: string; value: string; change: string; positive: boolean }[]; }
export interface ForecastOutcome { id: string; runId: string; predicted: number; observed?: number; error?: number; evaluatedAt?: string; }
