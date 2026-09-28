import { Prisma, prisma } from '@market/database';

type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface OperationalAlertInput {
  sourceId?: string;
  key: string;
  kind: string;
  title: string;
  message: string;
  severity?: Severity;
  metadata?: unknown;
}

export interface ExternalAlertMessage {
  dedupeKey: string;
  kind: string;
  severity: Severity;
  title: string;
  message: string;
  dataSourceId?: string | null;
}

const mockAlerts: ExternalAlertMessage[] = [];

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function provider() {
  return process.env.OPS_ALERT_PROVIDER ?? 'none';
}

function minIntervalMs() {
  return Number(process.env.OPS_ALERT_MIN_INTERVAL_MINUTES ?? 60) * 60_000;
}

async function sendExternalAlert(message: ExternalAlertMessage) {
  if (provider() === 'none') return;
  if (provider() === 'mock') {
    mockAlerts.push(message);
    return;
  }
  if (provider() === 'webhook') {
    const url = process.env.OPS_ALERT_WEBHOOK_URL;
    if (!url) throw new Error('OPS_ALERT_WEBHOOK_URL is required for webhook operational alerts');
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(message) });
    if (!response.ok) throw new Error(`Operational alert webhook returned HTTP ${response.status}`);
    return;
  }
  throw new Error(`Unsupported operational alert provider: ${provider()}`);
}

export function drainMockOperationalAlerts() {
  return mockAlerts.splice(0);
}

export async function upsertOperationalAlert(input: OperationalAlertInput) {
  const now = new Date();
  const severity = input.severity ?? 'WARNING';
  const existing = await prisma.operationalAlert.findUnique({ where: { dedupeKey: input.key } });
  const alert = existing ? await prisma.operationalAlert.update({ where: { id: existing.id }, data: {
    status: 'OPEN', severity, title: input.title, message: input.message,
    metadata: input.metadata === undefined ? Prisma.JsonNull : json(input.metadata),
    lastSeenAt: now, resolvedAt: null,
  } }) : await prisma.operationalAlert.create({ data: {
    dedupeKey: input.key, dataSourceId: input.sourceId, kind: input.kind, severity,
    title: input.title, message: input.message,
    metadata: input.metadata === undefined ? Prisma.JsonNull : json(input.metadata),
  } });
  const shouldSend = provider() !== 'none' &&
    (!alert.lastExternalSentAt || now.getTime() - alert.lastExternalSentAt.getTime() >= minIntervalMs());
  if (!shouldSend) return alert;
  const message: ExternalAlertMessage = { dedupeKey: alert.dedupeKey, kind: alert.kind,
    severity: alert.severity, title: alert.title, message: alert.message, dataSourceId: alert.dataSourceId };
  try {
    await sendExternalAlert(message);
    return prisma.operationalAlert.update({ where: { id: alert.id }, data: {
      lastExternalSentAt: now, externalSendCount: { increment: 1 }, externalLastError: null,
    } });
  } catch (error) {
    return prisma.operationalAlert.update({ where: { id: alert.id }, data: {
      externalLastError: error instanceof Error ? error.message : String(error),
    } });
  }
}

export async function resolveOperationalAlert(key: string) {
  await prisma.operationalAlert.updateMany({ where: { dedupeKey: key, status: { not: 'RESOLVED' } },
    data: { status: 'RESOLVED', resolvedAt: new Date() } });
}
