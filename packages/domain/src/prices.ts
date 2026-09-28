export interface PricePoint { priceMinor: number; observedAt: Date }

export interface PriceStatistics {
  currentPriceMinor: number;
  average7d: number | null;
  average30d: number | null;
  average90d: number | null;
  historicalMin: number | null;
  historicalMax: number | null;
  percentile: number | null;
  differenceFrom30dPercent: number | null;
  differenceFrom90dPercent: number | null;
  sampleCount: number;
}

function average(points: PricePoint[]): number | null {
  return points.length ? points.reduce((sum, point) => sum + point.priceMinor, 0) / points.length : null;
}

export function percentBelow(reference: number | null, current: number): number | null {
  return reference && reference > 0 ? (reference - current) / reference * 100 : null;
}

export function calculatePriceStatistics(current: PricePoint, history: PricePoint[]): PriceStatistics {
  if (!Number.isInteger(current.priceMinor) || current.priceMinor < 0 || !Number.isFinite(current.observedAt.getTime())) throw new Error('Invalid current price');
  const prior = history.filter(point => Number.isInteger(point.priceMinor) && point.priceMinor >= 0 &&
    Number.isFinite(point.observedAt.getTime()) && point.observedAt.getTime() < current.observedAt.getTime());
  const window = (days: number) => prior.filter(point => point.observedAt.getTime() >= current.observedAt.getTime() - days * 86_400_000);
  const average7d = average(window(7));
  const average30d = average(window(30));
  const average90d = average(window(90));
  const sorted = prior.map(point => point.priceMinor).sort((a, b) => a - b);
  return {
    currentPriceMinor: current.priceMinor,
    average7d, average30d, average90d,
    historicalMin: sorted[0] ?? null,
    historicalMax: sorted.at(-1) ?? null,
    percentile: sorted.length ? sorted.filter(price => price <= current.priceMinor).length / sorted.length * 100 : null,
    differenceFrom30dPercent: percentBelow(average30d, current.priceMinor),
    differenceFrom90dPercent: percentBelow(average90d, current.priceMinor),
    sampleCount: sorted.length,
  };
}

export function promotionDiscountPercent(priceMinor: number, regularPriceMinor: number | null): number | null {
  if (!Number.isInteger(priceMinor) || priceMinor < 0 || regularPriceMinor === null ||
      !Number.isInteger(regularPriceMinor) || regularPriceMinor <= 0 || priceMinor > regularPriceMinor) return null;
  return (regularPriceMinor - priceMinor) / regularPriceMinor * 100;
}
