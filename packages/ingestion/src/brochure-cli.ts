import { prisma } from '@market/database';
import { importBrochure } from './brochure.js';

const [filePath, ...flags] = process.argv.slice(2);
if (!filePath || flags.some((flag, index) => index % 2 === 0 && !['--source', '--source-id', '--source-url'].includes(flag))) {
  console.error('Usage: pnpm ingest:brochure <file.pdf|file.jpg|file.jpeg|file.png> [--source <name>] [--source-id <identifier>] [--source-url <url>]');
  process.exit(2);
}

const value = (flag: string) => { const index = flags.indexOf(flag); return index < 0 ? undefined : flags[index + 1]; };

try {
  const result = await importBrochure(filePath, { source: value('--source'), sourceIdentifier: value('--source-id'),
    sourceUrl: value('--source-url') });
  console.log(JSON.stringify({ event: 'brochure_ingestion_finished', ...result }));
} catch (error) {
  console.error(JSON.stringify({ event: 'brochure_ingestion_failed', message: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
