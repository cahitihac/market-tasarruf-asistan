import { Database, database } from '@market/database';

export async function createIngestionReviewForRow(rowId: string) {
  const row = await database.ingestionRow.findUniqueOrThrow({ where: { id: rowId } });
  if (row.status !== 'FAILED' && row.status !== 'UNMATCHED') return null;
  return database.ingestionReviewItem.upsert({ where: { ingestionRowId: row.id }, update: {
    rawValues: row.rawPayload ?? Database.JsonNull,
    reason: row.reason ?? row.status,
  }, create: {
    ingestionRowId: row.id,
    rawValues: row.rawPayload ?? Database.JsonNull,
    reason: row.reason ?? row.status,
    candidateMatches: [],
  } });
}
