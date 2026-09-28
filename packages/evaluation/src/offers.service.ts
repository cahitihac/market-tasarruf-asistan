import { prisma } from '@market/database';
import { loadConfig } from '@market/config';
import { calculatePriceStatistics, distanceKm, isCurrentPrice, isPromotionActive, matchNeed, promotionDiscountPercent, rankOffer, scoreDeal, type NeedMatch } from '@market/domain';
import type { NeedConstraints } from '@market/contracts';
import type { UserNeed } from '@market/database';

export type NeedRecord = UserNeed & { category: { slug: string; name: string } | null };

interface PreliminaryOffer {
  listing: Awaited<ReturnType<typeof loadListings>>[number];
  current: Awaited<ReturnType<typeof loadObservations>>[number];
  history: Awaited<ReturnType<typeof loadObservations>>;
  match: NeedMatch;
  distanceKm: number | null;
}

function loadListings(categoryId?: string | null) {
  return prisma.retailerProduct.findMany({
    where: { reviewState: 'APPROVED', variantId: { not: null },
      ...(categoryId ? { variant: { is: { product: { is: { categoryId } } } } } : {}) },
    include: { chain: true, variant: { include: { product: { include: { brand: true, category: true } } } } },
  });
}

function loadObservations(ids: string[], now: Date) {
  return prisma.priceObservation.findMany({
    where: { retailerProductId: { in: ids }, currency: 'TRY', observedAt: { lte: now } },
    include: { branch: true, promotion: { select: { startsAt: true, endsAt: true } } },
    orderBy: [{ observedAt: 'desc' }, { retrievedAt: 'desc' }, { id: 'desc' }],
  });
}

export async function matchingOffers(need: NeedRecord, constraints: NeedConstraints) {
  const now = new Date();
  const maximumAgeHours = loadConfig().PRICE_FRESHNESS_HOURS;
  const listings = await loadListings(need.categoryId);
  const observations = await loadObservations(listings.map(listing => listing.id), now);
  const home = await prisma.userLocation.findFirst({ where: { userId: need.userId }, orderBy: { id: 'asc' } });
  const byListingAndBranch = new Map<string, typeof observations>();
  for (const observation of observations) {
    const key = `${observation.retailerProductId}:${observation.branchId ?? 'online'}`;
    const group = byListingAndBranch.get(key) ?? [];
    group.push(observation);
    byListingAndBranch.set(key, group);
  }

  const preliminaries: PreliminaryOffer[] = [];
  for (const listing of listings) {
    const variant = listing.variant;
    if (!variant) continue;
    for (const [key, group] of byListingAndBranch) {
      if (!key.startsWith(`${listing.id}:`)) continue;
      const current = group[0];
      if (!current || !isCurrentPrice(current.observedAt, now, maximumAgeHours) ||
        (current.promotionId && !isPromotionActive(current.promotion, now))) continue;
      const distance = home && current.branch?.latitude != null && current.branch.longitude != null
        ? distanceKm(home, { latitude: current.branch.latitude, longitude: current.branch.longitude }) : null;
      const match = matchNeed({ name: need.title, categorySlug: need.category?.slug, ...constraints }, {
        productName: variant.product.name, categorySlug: variant.product.category.slug, brandName: variant.product.brand?.name ?? null,
        quantity: variant.quantity, unit: variant.unit, packageCount: variant.packageCount, priceMinor: current.priceMinor, distanceKm: distance,
      });
      if (match) preliminaries.push({ listing, current, history: group.slice(1), match, distanceKm: distance });
    }
  }

  const unitPricesByBasis = new Map<NeedMatch['unitBasis'], number[]>();
  for (const item of preliminaries) {
    const prices = unitPricesByBasis.get(item.match.unitBasis) ?? [];
    prices.push(item.match.unitPriceMinor);
    unitPricesByBasis.set(item.match.unitBasis, prices);
  }
  const medianByBasis = new Map<NeedMatch['unitBasis'], number>();
  for (const [basis, prices] of unitPricesByBasis) {
    prices.sort((a, b) => a - b);
    const middle = Math.floor(prices.length / 2);
    const median = prices.length % 2 ? prices[middle]! : (prices[middle - 1]! + prices[middle]!) / 2;
    medianByBasis.set(basis, median);
  }

  const offers = preliminaries.map(item => {
    const variant = item.listing.variant!;
    const product = variant.product;
    const statistics = calculatePriceStatistics(
      { priceMinor: item.current.priceMinor, observedAt: item.current.observedAt },
      item.history.map(point => ({ priceMinor: point.priceMinor, observedAt: point.observedAt })),
    );
    const median = medianByBasis.get(item.match.unitBasis);
    const deal = scoreDeal({
      statistics,
      promotionDiscountPercent: promotionDiscountPercent(item.current.priceMinor, item.current.regularPriceMinor),
      unitPriceAdvantagePercent: median && median > 0 ? (median - item.match.unitPriceMinor) / median * 100 : null,
    });
    return {
      observationId: item.current.id,
      canonicalProduct: { id: product.id, name: product.name, category: product.category.slug, brand: product.brand?.name ?? null,
        variant: { id: variant.id, quantity: variant.quantity, unit: variant.unit, packageCount: variant.packageCount } },
      retailerProduct: { id: item.listing.id, name: item.listing.rawName, externalId: item.listing.externalId },
      retailer: { id: item.listing.chain.id, name: item.listing.chain.name, branch: item.current.branch ? { id: item.current.branch.id, name: item.current.branch.name } : null },
      currentPrice: { amountMinor: item.current.priceMinor, currency: item.current.currency,
        observedAt: item.current.observedAt, verificationStatus: item.current.verificationStatus },
      regularPrice: item.current.regularPriceMinor === null ? null : { amountMinor: item.current.regularPriceMinor, currency: item.current.currency },
      unitPrice: { amountMinor: item.match.unitPriceMinor, basis: item.match.unitBasis, currency: item.current.currency },
      priceStatistics: statistics,
      dealScore: deal.score,
      recommendation: deal.label,
      action: deal.action,
      explanationReasons: deal.reasons,
      matchScore: item.match.matchScore,
      matchReason: item.match.matchReason,
      brandTier: item.match.brandTier,
      distanceKm: item.distanceKm,
      rankScore: rankOffer(item.match.matchScore, deal.score),
    };
  });
  offers.sort((a, b) => b.rankScore - a.rankScore || b.dealScore - a.dealScore || a.unitPrice.amountMinor - b.unitPrice.amountMinor || a.retailerProduct.id.localeCompare(b.retailerProduct.id));
  return offers;
}
