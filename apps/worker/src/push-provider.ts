export type PushData = { type: 'DEAL'; dealId: string };

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: PushData;
  sound?: 'default';
}

export interface PushResult {
  status: 'ok' | 'invalid-token' | 'error';
  providerMessageId?: string;
  error?: string;
}

export interface PushReceipt {
  status: 'ok' | 'error';
  error?: string;
}

export interface PushProvider {
  send(message: PushMessage): Promise<PushResult>;
  sendBatch(messages: PushMessage[]): Promise<PushResult[]>;
  checkReceipts(providerMessageIds: string[]): Promise<Record<string, PushReceipt>>;
}

export class PushProviderError extends Error {
  constructor(message: string, readonly kind: 'temporary' | 'permanent' | 'invalid-token') {
    super(message);
    this.name = 'PushProviderError';
  }
}

type ExpoTicket = { status: 'ok'; id: string } | { status: 'error'; message?: string; details?: { error?: string } };
type ExpoPushResponse = { data?: ExpoTicket | ExpoTicket[]; errors?: Array<{ code?: string; message?: string }> };
type ExpoReceipt = { status: 'ok' } | { status: 'error'; message?: string; details?: { error?: string } };
type ExpoReceiptResponse = { data?: Record<string, ExpoReceipt>; errors?: Array<{ code?: string; message?: string }> };

function providerErrorFromStatus(response: Response, body: ExpoPushResponse | ExpoReceiptResponse | null) {
  const message = body?.errors?.map(error => error.message || error.code).filter(Boolean).join('; ') ||
    `Expo push request failed with HTTP ${response.status}`;
  if (response.status === 429 || response.status >= 500) return new PushProviderError(message, 'temporary');
  return new PushProviderError(message, 'permanent');
}

function ticketToResult(ticket: ExpoTicket): PushResult {
  if (ticket.status === 'ok') return { status: 'ok', providerMessageId: ticket.id };
  if (ticket.details?.error === 'DeviceNotRegistered') {
    return { status: 'invalid-token', error: ticket.message ?? 'DeviceNotRegistered' };
  }
  return { status: 'error', error: ticket.message ?? ticket.details?.error ?? 'Expo rejected the push message.' };
}

export class ExpoPushProvider implements PushProvider {
  constructor(private readonly options: {
    sendUrl?: string;
    receiptsUrl?: string;
    accessToken?: string;
    fetchImpl?: typeof fetch;
  } = {}) {}

  async send(message: PushMessage) {
    const [result] = await this.sendBatch([message]);
    return result ?? { status: 'error' as const, error: 'Expo returned no ticket.' };
  }

  async sendBatch(messages: PushMessage[]): Promise<PushResult[]> {
    if (messages.length === 0) return [];
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl(this.options.sendUrl ?? 'https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(this.options.accessToken ? { Authorization: `Bearer ${this.options.accessToken}` } : {}),
      },
      body: JSON.stringify(messages),
    });
    const body = await response.json().catch(() => null) as ExpoPushResponse | null;
    if (!response.ok) throw providerErrorFromStatus(response, body);
    if (body?.errors?.length) throw new PushProviderError(body.errors.map(error => error.message || error.code).join('; '), 'permanent');
    const data = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : [];
    return messages.map((_, index) => data[index] ? ticketToResult(data[index]!) : {
      status: 'error' as const,
      error: 'Expo returned no ticket for this message.',
    });
  }

  async checkReceipts(providerMessageIds: string[]) {
    if (providerMessageIds.length === 0) return {};
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl(this.options.receiptsUrl ?? 'https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(this.options.accessToken ? { Authorization: `Bearer ${this.options.accessToken}` } : {}),
      },
      body: JSON.stringify({ ids: providerMessageIds }),
    });
    const body = await response.json().catch(() => null) as ExpoReceiptResponse | null;
    if (!response.ok) throw providerErrorFromStatus(response, body);
    if (body?.errors?.length) throw new PushProviderError(body.errors.map(error => error.message || error.code).join('; '), 'temporary');
    const receipts: Record<string, PushReceipt> = {};
    for (const [id, receipt] of Object.entries(body?.data ?? {})) {
      receipts[id] = receipt.status === 'ok' ? { status: 'ok' } :
        { status: 'error', error: receipt.details?.error ?? receipt.message ?? 'Expo receipt error.' };
    }
    return receipts;
  }
}

export class MockPushProvider implements PushProvider {
  readonly messages: PushMessage[] = [];
  mode: 'success' | 'temporary-failure' | 'invalid-token' = 'success';

  constructor(mode: MockPushProvider['mode'] = 'success') {
    this.mode = mode;
  }

  async send(message: PushMessage) {
    const [result] = await this.sendBatch([message]);
    return result ?? { status: 'error' as const, error: 'No mock result.' };
  }

  async sendBatch(messages: PushMessage[]) {
    this.messages.push(...messages);
    if (this.mode === 'temporary-failure') throw new PushProviderError('Mock temporary failure', 'temporary');
    return messages.map((_, index) => this.mode === 'invalid-token'
      ? { status: 'invalid-token' as const, error: 'DeviceNotRegistered' }
      : { status: 'ok' as const, providerMessageId: `mock-ticket-${this.messages.length - messages.length + index + 1}` });
  }

  async checkReceipts(providerMessageIds: string[]) {
    return Object.fromEntries(providerMessageIds.map(id => [id, { status: 'ok' as const }]));
  }
}

export function configuredPushProvider() {
  return new ExpoPushProvider({ accessToken: process.env.EXPO_PUSH_ACCESS_TOKEN });
}
