import { Database, database } from '@market/database';
import type { NeedRecord } from '@market/evaluation';

const includeCategory = { category: { select: { slug: true, name: true } } } as const;
export type { NeedRecord } from '@market/evaluation';

export async function demoUser() {
  return database.user.findUnique({ where: { email: 'demo@market.local' }, select: { id: true } });
}

export async function listNeeds(userId: string): Promise<NeedRecord[]> {
  return database.userNeed.findMany({ where: { userId, active: true }, include: includeCategory, orderBy: { createdAt: 'desc' } });
}

export async function getNeed(userId: string, id: string): Promise<NeedRecord | null> {
  return database.userNeed.findFirst({ where: { id, userId, active: true }, include: includeCategory });
}

export async function createNeed(data: { userId: string; title: string; categoryId: string | null; constraints: Database.InputJsonValue }): Promise<NeedRecord> {
  return database.userNeed.create({ data, include: includeCategory });
}

export async function updateNeed(id: string, data: { title: string; categoryId: string | null; constraints: Database.InputJsonValue }): Promise<NeedRecord> {
  return database.userNeed.update({ where: { id }, data, include: includeCategory });
}

export async function archiveNeed(id: string): Promise<void> {
  await database.userNeed.update({ where: { id }, data: { active: false } });
}

export async function findCategory(slug: string) {
  return database.category.findUnique({ where: { slug }, select: { id: true, slug: true, name: true } });
}

export async function allCategories() {
  return database.category.findMany({ select: { id: true, slug: true, name: true } });
}
