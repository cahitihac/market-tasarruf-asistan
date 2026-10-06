import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./src/test-setup.ts'],
    fileParallelism: false,
    isolate: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
