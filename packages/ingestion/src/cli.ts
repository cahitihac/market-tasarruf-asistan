import { database } from '@market/database';
import { resolve } from 'node:path';
import { fileConnector } from './connector.js';
import { ingestPrices } from './ingest.js';

const [filePath, ...flags] = process.argv.slice(2);
if (!filePath || flags.some((flag, index) => index % 2 === 0 && !['--source-name', '--source-url'].includes(flag))) {
  console.error('Usage: pnpm ingest:prices <file.csv|file.json> [--source-name <name>] [--source-url <url>]');
  process.exit(2);
}
const value = (flag: string) => { const index = flags.indexOf(flag); return index < 0 ? undefined : flags[index + 1]; };
try {
  const inputPath = resolve(process.env.INIT_CWD ?? process.cwd(), filePath);
  const connector = await fileConnector(inputPath, { sourceName: value('--source-name'), sourceUrl: value('--source-url') });
  const run = await ingestPrices(connector);
  console.log(JSON.stringify({ event: 'ingestion_finished', runId: run.id, source: run.source, status: run.status,
    processed: run.processedCount, matched: run.matchedCount, unmatched: run.unmatchedCount,
    createdProducts: run.createdProductsCount, updatedProducts: run.updatedProductsCount,
    priceObservationsCreated: run.observationsCreatedCount, duplicatesSkipped: run.duplicatesSkippedCount,
    promotionsCreated: run.promotionsCreatedCount, failures: run.failureCount, errors: run.errors }));
  if (run.status === 'FAILED') process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ event: 'ingestion_cli_failed', message: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
} finally { await database.$disconnect(); }
