import { database } from '@market/database';
import { ingestPrices } from './ingest.js';
import { createOpenPricesConnector } from './open-prices.js';

const args = process.argv.slice(2);
const value = (flag: string) => { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1]; };
if (args.some((flag, index) => index % 2 === 0 && flag !== '--limit')) {
  console.error('Usage: pnpm ingest:open-prices [--limit <1-500>]');
  process.exit(2);
}
const requestedLimit = value('--limit');
const limit = requestedLimit === undefined ? 25 : Number(requestedLimit);
if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
  console.error('--limit must be an integer from 1 to 500');
  process.exit(2);
}
try {
  const connector = await createOpenPricesConnector({ maxRecords: limit });
  const run = await ingestPrices(connector);
  console.log(JSON.stringify({ event: 'ingestion_finished', runId: run.id, source: run.source, status: run.status,
    processed: run.processedCount, matched: run.matchedCount, unmatched: run.unmatchedCount,
    canonicalProductsCreated: run.createdProductsCount, canonicalProductsUpdated: run.updatedProductsCount,
    priceObservationsCreated: run.observationsCreatedCount, duplicatesSkipped: run.duplicatesSkippedCount,
    failures: run.failureCount, errors: run.errors }));
  if (run.status === 'FAILED') process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ event: 'open_prices_ingestion_failed', message: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
} finally { await database.$disconnect(); }
