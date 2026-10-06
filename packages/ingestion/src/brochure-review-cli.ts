import { database } from '@market/database';
import { approveBrochureReview, listPendingBrochureReviews, rejectBrochureReview } from './brochure.js';

const [command, id, variantId] = process.argv.slice(2);
if (!command || !['list', 'approve', 'match', 'reject'].includes(command) ||
  (['approve', 'match', 'reject'].includes(command) && !id) || (command === 'match' && !variantId)) {
  console.error('Usage: pnpm brochure:review list | approve <reviewItemId> | match <reviewItemId> <variantId> | reject <reviewItemId>');
  process.exit(2);
}

try {
  if (command === 'list') {
    const items = await listPendingBrochureReviews();
    console.log(JSON.stringify({ event: 'brochure_review_pending', count: items.length,
      items: items.map(item => ({ id: item.id, offerId: item.brochureOfferId, retailer: item.brochureOffer.brochure.chain.name,
        productName: item.brochureOffer.productName, sourceLocation: item.sourceLocation, confidence: item.confidence,
        reason: item.reason, candidateMatches: item.candidateMatches })) }, null, 2));
  }
  if (command === 'approve') {
    console.log(JSON.stringify({ event: 'brochure_review_approved', reviewItemId: id,
      result: await approveBrochureReview(id!) }));
  }
  if (command === 'match') {
    console.log(JSON.stringify({ event: 'brochure_review_matched', reviewItemId: id, variantId,
      result: await approveBrochureReview(id!, variantId) }));
  }
  if (command === 'reject') {
    const review = await rejectBrochureReview(id!);
    console.log(JSON.stringify({ event: 'brochure_review_rejected', reviewItemId: review.id }));
  }
} catch (error) {
  console.error(JSON.stringify({ event: 'brochure_review_failed', message: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
} finally { await database.$disconnect(); }
