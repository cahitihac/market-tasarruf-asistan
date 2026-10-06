import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('health API', () => {
  it('responds without a database connection', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject('/health');
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    } finally { await app.close(); }
  });
  it('accepts a configured Expo web origin for browser requests', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({ method: 'OPTIONS', url: '/needs', headers: {
        origin: 'http://localhost:8081', 'access-control-request-method': 'POST',
      } });
      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8081');
      const patch = await app.inject({ method: 'OPTIONS', url: '/notifications/example/read', headers: {
        origin: 'http://localhost:8081', 'access-control-request-method': 'PATCH',
      } });
      expect(patch.statusCode).toBe(204);
      expect(patch.headers['access-control-allow-methods']).toContain('PATCH');
    } finally { await app.close(); }
  });
});
