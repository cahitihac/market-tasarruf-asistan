import { buildApp } from './app.js';

type HttpApiResult = { statusCode: number; headers: Record<string, string>; body: string };
type RequestMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';

type HttpApiEvent = {
  rawPath?: string;
  rawQueryString?: string;
  body?: string | null;
  isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>;
  requestContext?: { http?: { method?: string; path?: string; sourceIp?: string } };
};

let appPromise: ReturnType<typeof buildApp> | undefined;

function app() {
  appPromise ??= buildApp();
  return appPromise;
}

export async function handler(event: HttpApiEvent): Promise<HttpApiResult> {
  const method = (event.requestContext?.http?.method ?? 'GET').toUpperCase() as RequestMethod;
  const path = event.rawPath ?? event.requestContext?.http?.path ?? '/';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const headers = Object.fromEntries(Object.entries(event.headers ?? {})
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  const payload = event.body == null ? undefined : Buffer.from(event.body,
    event.isBase64Encoded ? 'base64' : 'utf8');
  const response = await (await app()).inject({ method, url: `${path}${query}`, headers,
    payload: payload?.toString('utf8'), remoteAddress: event.requestContext?.http?.sourceIp });
  const responseHeaders = Object.fromEntries(Object.entries(response.headers)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  return { statusCode: response.statusCode, headers: responseHeaders, body: response.body };
}
