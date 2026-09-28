import { createHash } from 'node:crypto';
import { needConstraintsSchema } from '@market/contracts';
import { Prisma, prisma } from '@market/database';
import { DEAL_SCORE_VERSION, shouldAlert, type PreviousAlert } from '@market/domain';
import { matchingOffers, type NeedRecord } from './offers.service.js';

type Offer = Awaited<ReturnType<typeof matchingOffers>>[number];
export interface EvaluationCounts {
  activeNeedsEvaluated: number;
  matchingProductsFound: number;
  dealsCreated: number;
  dealsUpdated: number;
  alertsCreated: number;
  notificationsCreated: number;
  failureCount: number;
}
const zeroCounts = (): EvaluationCounts => ({ activeNeedsEvaluated: 0, matchingProductsFound: 0, dealsCreated: 0,
  dealsUpdated: 0, alertsCreated: 0, notificationsCreated: 0, failureCount: 0 });

function snapshotKey(need: NeedRecord, offer: Offer) {
  const revision = createHash('sha256').update(JSON.stringify({ dealScoreVersion: DEAL_SCORE_VERSION,
    title: need.title, categoryId: need.categoryId, constraints: need.constraints })).digest('hex').slice(0, 16);
  return `${need.id}:${offer.observationId}:${revision}`;
}

function snapshot(need: NeedRecord, offer: Offer) {
  return {
    snapshotKey: snapshotKey(need, offer),
    userId: need.userId, needId: need.id, canonicalProductId: offer.canonicalProduct.id,
    retailerProductId: offer.retailerProduct.id, branchId: offer.retailer.branch?.id ?? null,
    observationId: offer.observationId, productName: offer.canonicalProduct.name,
    retailerName: offer.retailer.name, branchName: offer.retailer.branch?.name ?? null,
    currentPriceMinor: offer.currentPrice.amountMinor, unitPriceMinor: offer.unitPrice.amountMinor,
    unitBasis: offer.unitPrice.basis, currency: offer.currentPrice.currency,
    matchScore: offer.matchScore, score: offer.dealScore, label: offer.recommendation,
    action: offer.action, reasons: offer.explanationReasons as Prisma.InputJsonValue,
    matchReasons: offer.matchReason as Prisma.InputJsonValue,
    priceStatistics: offer.priceStatistics as unknown as Prisma.InputJsonValue,
    observedAt: offer.currentPrice.observedAt, status: 'ACTIVE' as const,
  };
}

export async function evaluateNeed(need: NeedRecord): Promise<EvaluationCounts> {
  const offers = await matchingOffers(need, needConstraintsSchema.parse(need.constraints));
  const counts = zeroCounts();
  counts.activeNeedsEvaluated = 1;
  counts.matchingProductsFound = offers.length;
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${need.id}))`;
    const active = await tx.deal.findMany({ where: { needId: need.id, status: 'ACTIVE' } });
    const currentKeys = new Set(offers.map(offer => snapshotKey(need, offer)));
    for (const old of active) {
      if (currentKeys.has(old.snapshotKey)) continue;
      const stillMatched = offers.some(offer => offer.retailerProduct.id === old.retailerProductId &&
        (offer.retailer.branch?.id ?? null) === old.branchId);
      await tx.deal.update({ where: { id: old.id }, data: { status: stillMatched ? 'SUPERSEDED' : 'EXPIRED', evaluatedAt: new Date() } });
      counts.dealsUpdated++;
    }

    for (const offer of offers) {
      const data = snapshot(need, offer);
      const existing = await tx.deal.findUnique({ where: { snapshotKey: data.snapshotKey } });
      const deal = existing
        ? existing.status === 'ACTIVE' ? existing : await tx.deal.update({ where: { id: existing.id }, data: { status: 'ACTIVE', evaluatedAt: new Date() } })
        : await tx.deal.create({ data });
      if (existing?.status !== 'ACTIVE' && existing) counts.dealsUpdated++;
      if (!existing) counts.dealsCreated++;
      if (offer.currentPrice.verificationStatus === 'SUPPLIED_UNVERIFIED') continue;

      const previous = await tx.alert.findFirst({ where: { needId: need.id, deal: {
        retailerProductId: offer.retailerProduct.id, branchId: offer.retailer.branch?.id ?? null,
      } }, include: { deal: true }, orderBy: { createdAt: 'desc' } });
      const previousAlert: PreviousAlert | null = previous ? {
        observationId: previous.deal.observationId, priceMinor: previous.deal.currentPriceMinor,
        label: previous.deal.label, observedAt: previous.deal.observedAt, createdAt: previous.createdAt,
      } : null;
      const previousWasActive = active.some(old => old.retailerProductId === offer.retailerProduct.id &&
        old.branchId === (offer.retailer.branch?.id ?? null) && old.label !== 'NORMAL_PRICE' && old.label !== 'GOOD_PRICE' && old.label !== 'BAD_PRICE');
      if (!shouldAlert({ observationId: offer.observationId, priceMinor: offer.currentPrice.amountMinor,
        label: offer.recommendation, observedAt: offer.currentPrice.observedAt }, previousAlert, previousWasActive)) continue;
      const alert = await tx.alert.create({ data: {
        dedupeKey: data.snapshotKey, userId: need.userId, needId: need.id, dealId: deal.id,
      } });
      counts.alertsCreated++;
      const difference = offer.priceStatistics.differenceFrom90dPercent;
      const savings = difference == null ? null : Math.abs(Math.round(difference));
      const price = `${(offer.currentPrice.amountMinor / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0,
        maximumFractionDigits: 2 })} TL`;
      const averageDetail = savings == null ? '' : ` Son 90 gün ortalamasından %${savings} daha ucuz.`;
      await tx.notification.create({ data: { userId: need.userId, alertId: alert.id, type: 'DEAL_ALERT',
        title: `${offer.canonicalProduct.name} için fırsat`,
        body: `${offer.retailer.name}'da ${price}.${averageDetail}`,
      } });
      counts.notificationsCreated++;
    }
  }, { timeout: 30000 });
  return counts;
}

export async function evaluateActiveNeeds(needIds?: string[]) {
  const run = await prisma.evaluationRun.create({ data: {} });
  const totals = zeroCounts();
  const errors: Array<{ needId: string; message: string }> = [];
  try {
    const needs = needIds?.length === 0 ? [] : await prisma.userNeed.findMany({ where: {
      active: true, ...(needIds ? { id: { in: [...new Set(needIds)] } } : {}),
    }, include: { category: { select: { slug: true, name: true } } }, orderBy: { id: 'asc' } });
    for (const need of needs) {
      try {
        const result = await evaluateNeed(need);
        for (const key of Object.keys(totals) as Array<keyof EvaluationCounts>) totals[key] += result[key];
      } catch (error) {
        totals.failureCount++;
        errors.push({ needId: need.id, message: error instanceof Error ? error.message : String(error) });
      }
    }
    // Archived needs cannot remain active opportunities.
    const expiredArchived = await prisma.deal.updateMany({ where: { status: 'ACTIVE', need: { active: false } },
      data: { status: 'EXPIRED', evaluatedAt: new Date() } });
    totals.dealsUpdated += expiredArchived.count;
  } catch (error) {
    totals.failureCount++;
    errors.push({ needId: 'run', message: error instanceof Error ? error.message : String(error) });
  }
  return prisma.evaluationRun.update({ where: { id: run.id }, data: { ...totals, errors,
    status: totals.failureCount === 0 ? 'SUCCEEDED' : totals.activeNeedsEvaluated === 0 ? 'FAILED' : 'PARTIAL',
    finishedAt: new Date() } });
}

export async function evaluateAllActiveNeeds() {
  return evaluateActiveNeeds();
}
