import { beforeEach, describe, expect, it } from 'vitest';
import { DynamoDataClient } from './dynamo.js';

describe('DynamoDataClient transactions', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.DYNAMODB_ENDPOINT = 'memory';
  });

  it('commits every staged write together', async () => {
    const client = new DynamoDataClient();
    const suffix = crypto.randomUUID();
    await client.$transaction(async tx => {
      await tx.user.create({ data: { id: `user-${suffix}`, email: `${suffix}@example.test` } });
      await tx.category.create({ data: { id: `category-${suffix}`, slug: `category-${suffix}`, name: 'Test' } });
    });

    await expect(client.user.findUnique({ where: { id: `user-${suffix}` } })).resolves.toMatchObject({ id: `user-${suffix}` });
    await expect(client.category.findUnique({ where: { id: `category-${suffix}` } })).resolves.toMatchObject({ id: `category-${suffix}` });
  });

  it('discards every staged write when the callback fails', async () => {
    const client = new DynamoDataClient();
    const suffix = crypto.randomUUID();
    const user = await client.user.create({ data: { id: `rollback-${suffix}`, email: `${suffix}@example.test`, displayName: 'Before' } });

    await expect(client.$transaction(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { displayName: 'After' } });
      await tx.category.update({ where: { id: `missing-${suffix}` }, data: { name: 'Never' } });
    })).rejects.toMatchObject({ code: 'P2025' });

    await expect(client.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ displayName: 'Before' });
  });

  it('rejects array-style calls that can start writes outside the transaction boundary', async () => {
    const client = new DynamoDataClient();
    await expect(client.$transaction([] as never)).rejects.toMatchObject({ code: 'INVALID_TRANSACTION' });
  });

  it('enforces unique keys atomically and ignores undefined updates', async () => {
    const client = new DynamoDataClient();
    const suffix = crypto.randomUUID();
    const user = await client.user.create({ data: { email: `${suffix}@example.test`, displayName: 'Kept' } });

    await expect(client.user.create({ data: { email: `${suffix}@example.test` } })).rejects.toMatchObject({ code: 'P2002' });
    await client.user.update({ where: { id: user.id }, data: { email: undefined } });
    await expect(client.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({
      email: `${suffix}@example.test`, displayName: 'Kept',
    });
  });
});
