import type { DealLabel } from './deals.js';

export interface AlertOpportunity {
  observationId: string;
  priceMinor: number;
  label: DealLabel;
  observedAt: Date;
}

export interface PreviousAlert extends AlertOpportunity {
  createdAt: Date;
}

export function shouldAlert(current: AlertOpportunity, previous: PreviousAlert | null, previousWasActive: boolean): boolean {
  if (current.label !== 'BUY' && current.label !== 'GREAT_DEAL') return false;
  if (!previous) return true;
  if (current.observationId === previous.observationId) return false;
  if (current.priceMinor <= previous.priceMinor * 0.92) return true;
  if (previous.label === 'BUY' && current.label === 'GREAT_DEAL') return true;
  return !previousWasActive && current.observedAt.getTime() - previous.createdAt.getTime() >= 24 * 60 * 60 * 1000;
}
