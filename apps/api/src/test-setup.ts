import { seedDatabase } from '@market/database/seed';

const testState = globalThis as typeof globalThis & { marketSeedPromise?: Promise<void> };
testState.marketSeedPromise ??= seedDatabase();
await testState.marketSeedPromise;
