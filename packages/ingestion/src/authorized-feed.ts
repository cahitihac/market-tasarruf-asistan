import type { PriceSourceConnector } from './connector.js';

export interface AuthorizedFeedSpecification {
  format: 'CSV' | 'JSON' | 'HTTP_JSON';
  endpoint?: string;
  credentialEnv?: string;
  rateLimitPerMinute?: number;
  freshnessHours?: number;
  retentionDays?: number;
  fields: {
    retailer: string;
    productName: string;
    currentPrice: string;
    observedAt: string;
    ean?: string;
    branch?: string;
    regularPrice?: string;
    promotionWindow?: string;
  };
}

export interface AuthorizedFeedReadiness {
  authorizationStatus: 'AUTHORIZED' | 'PUBLIC_DATA';
  onboardingStatus: 'APPROVED';
  permittedCommercialUse: true;
  specification: AuthorizedFeedSpecification;
}

export function assertAuthorizedFeedReady(input: {
  authorizationStatus: string;
  onboardingStatus: string;
  permittedCommercialUse: boolean;
  specification?: unknown;
}): asserts input is AuthorizedFeedReadiness {
  if (input.authorizationStatus !== 'AUTHORIZED' && input.authorizationStatus !== 'PUBLIC_DATA')
    throw new Error('Source is not authorized for ingestion');
  if (input.onboardingStatus !== 'APPROVED') throw new Error('Source onboarding is not approved');
  if (!input.permittedCommercialUse) throw new Error('Source does not permit commercial use');
  if (!input.specification || typeof input.specification !== 'object')
    throw new Error('Source feed specification is missing');
}

export async function createAuthorizedFeedConnector(readiness: AuthorizedFeedReadiness): Promise<PriceSourceConnector> {
  void readiness;
  throw new Error('No authorized Turkish grocery-price feed credentials and documented usage rights are configured yet');
}
