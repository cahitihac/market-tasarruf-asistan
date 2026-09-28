import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { resolveApiUrl } from './config';
import { ApiError, friendlyError, request } from './client';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const schema = z.object({ value: z.number() });
describe('mobile API client', () => {
  it('resolves local API addresses for web, simulators, emulators, and phones', () => {
    expect(resolveApiUrl('http://127.0.0.1:3001/', 'web')).toBe('http://127.0.0.1:3001');
    expect(resolveApiUrl('http://localhost:3001', 'ios')).toBe('http://localhost:3001');
    expect(resolveApiUrl('http://127.0.0.1:3001', 'android')).toBe('http://10.0.2.2:3001');
    expect(resolveApiUrl('http://192.168.1.42:3001', 'android')).toBe('http://192.168.1.42:3001');
    expect(resolveApiUrl('http://192.168.1.42:3001', 'ios')).toBe('http://192.168.1.42:3001');
  });
  it('uses the configured base URL and parses a successful response', async () => {
    const fetcher = vi.fn(async () => Response.json({ value: 7 }));
    expect(await request('/example', schema, {}, 'http://127.0.0.1:3001', fetcher as typeof fetch)).toEqual({ value: 7 });
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:3001/example', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
  it('reports API errors and unreachable servers clearly', async () => {
    const failing = vi.fn(async () => Response.json({ message: 'Unknown category' }, { status: 422 }));
    await expect(request('/needs', schema, {}, 'http://local', failing as typeof fetch)).rejects.toThrow('Unknown category');
    const offline = vi.fn(async () => { throw new TypeError('fetch failed'); });
    await expect(request('/needs', schema, {}, 'http://local', offline as typeof fetch)).rejects.toThrow('bağlantı kuramıyoruz');
    await expect(request('/needs', schema, {}, '', offline as typeof fetch)).rejects.toThrow('yapılandırılmamış');
  });
  it('rejects malformed API responses', async () => {
    const fetcher = vi.fn(async () => Response.json({ value: 'wrong' }));
    await expect(request('/example', schema, {}, 'http://local', fetcher as typeof fetch)).rejects.toThrow('gösterilemiyor');
    expect(friendlyError(new ApiError('Not found', 404))).toBe('Not found');
  });
  it('does not send JSON content type for bodyless PATCH requests', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input; void _init;
      return Response.json({ value: 1 });
    });
    await request('/read', schema, { method: 'PATCH' }, 'http://local', fetcher as typeof fetch);
    expect(fetcher.mock.calls[0]?.[1]?.headers).toEqual({});
  });
});
