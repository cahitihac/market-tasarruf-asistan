import { seedDatabase } from '@market/database/seed';
import { vi } from 'vitest';

const testState = globalThis as typeof globalThis & { marketSeedPromise?: Promise<void> };
vi.setSystemTime(new Date('2026-09-25T12:00:00.000Z'));
testState.marketSeedPromise ??= seedDatabase();
await testState.marketSeedPromise;
