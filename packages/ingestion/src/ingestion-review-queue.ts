import { Prisma, prisma } from '@market/database';

export async function createIngestionReviewForRow(rowId: string) {
  const row = await prisma.ingestionRow.findUniqueOrThrow({ where: { id: rowId } });
  if (row.status !== 'FAILED' && row.status !== 'UNMATCHED') return null;
  return prisma.ingestionReviewItem.upsert({ where: { ingestionRowId: row.id }, update: {
    rawValues: row.rawPayload ?? Prisma.JsonNull,
    reason: row.reason ?? row.status,
  }, create: {
    ingestionRowId: row.id,
    rawValues: row.rawPayload ?? Prisma.JsonNull,
    reason: row.reason ?? row.status,
    candidateMatches: [],
  } });
}
