import { config as loadDotEnv } from 'dotenv';
import { createHash, randomBytes, scryptSync } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { database as db } from '../src/index.js';

loadDotEnv({ path: new URL('../../../.env', import.meta.url).pathname });

const passwordHash = (password: string) => createHash('sha256').update(`market-admin:${password}`).digest('hex');
const consumerPasswordHash = (password: string) => {
  const salt = randomBytes(16).toString('base64url');
  const key = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt}$${key.toString('base64url')}`;
};

const catalog = [
  { slug: 'dishwasher-tablets', category: 'Dishwasher tablets', brand: 'Finish', name: 'Finish Quantum 72 tablets', quantity: 72, unit: 'piece', base: 41000, ean: '8690570568127' },
  { slug: 'dishwasher-tablets', category: 'Dishwasher tablets', brand: 'Fairy', name: 'Fairy Platinum 60 tablets', quantity: 60, unit: 'piece', base: 38900 },
  { slug: 'olive-oil', category: 'Olive oil', brand: 'Komili', name: 'Komili Extra Virgin Olive Oil 1 L', quantity: 1000, unit: 'ml', base: 44900 },
  { slug: 'coffee', category: 'Coffee', brand: 'Mehmet Efendi', name: 'Mehmet Efendi Turkish Coffee 100 g', quantity: 100, unit: 'g', base: 9900 },
  { slug: 'laundry-detergent', category: 'Laundry detergent', brand: 'Ariel', name: 'Ariel Powder Detergent 6 kg', quantity: 6000, unit: 'g', base: 57900 },
  { slug: 'toilet-paper', category: 'Toilet paper', brand: 'Papia', name: 'Papia Toilet Paper 32 rolls', quantity: 32, unit: 'piece', base: 29900 },
  { slug: 'milk', category: 'Milk', brand: 'Pinar', name: 'Pinar Whole Milk 1 L', quantity: 1000, unit: 'ml', base: 5200 },
  { slug: 'eggs', category: 'Eggs', brand: 'Gezen', name: 'Gezen Eggs 30 count', quantity: 30, unit: 'piece', base: 15900 },
  { slug: 'chicken', category: 'Chicken', brand: 'Banvit', name: 'Banvit Chicken Breast 1 kg', quantity: 1000, unit: 'g', base: 23900 },
  { slug: 'rice', category: 'Rice', brand: 'Baldo', name: 'Baldo Rice 1 kg', quantity: 1000, unit: 'g', base: 11900 },
  { slug: 'pasta', category: 'Pasta', brand: 'Filiz', name: 'Filiz Spaghetti 500 g', quantity: 500, unit: 'g', base: 3900 },
] as const;

const chains = [
  { slug: 'migros', name: 'Migros', factor: 1 },
  { slug: 'bim', name: 'BIM', factor: 0.93 },
  { slug: 'a101', name: 'A101', factor: 0.96 },
  { slug: 'carrefoursa', name: 'CarrefourSA', factor: 1.04 },
  { slug: 'sok', name: 'SOK', factor: 0.98 },
] as const;

export async function seedDatabase() {
  await db.adminUser.upsert({ where: { email: 'viewer@market.local' }, update: { role: 'VIEWER', active: true },
    create: { email: 'viewer@market.local', displayName: 'Demo Viewer', role: 'VIEWER', passwordHash: passwordHash('viewer-demo') } });
  await db.adminUser.upsert({ where: { email: 'reviewer@market.local' }, update: { role: 'REVIEWER', active: true },
    create: { email: 'reviewer@market.local', displayName: 'Demo Reviewer', role: 'REVIEWER', passwordHash: passwordHash('reviewer-demo') } });
  await db.adminUser.upsert({ where: { email: 'admin@market.local' }, update: { role: 'ADMIN', active: true },
    create: { email: 'admin@market.local', displayName: 'Demo Admin', role: 'ADMIN', passwordHash: passwordHash('admin-demo') } });
  const demoUser = await db.user.upsert({ where: { email: 'demo@market.local' }, update: {}, create: { email: 'demo@market.local', displayName: 'Demo User' } });
  const verifiedAt = new Date('2026-09-20T10:00:00.000Z');
  const consumer1 = await db.user.upsert({ where: { email: 'consumer1@example.test' },
    update: { passwordHash: consumerPasswordHash('consumer1-demo'), status: 'ACTIVE', displayName: 'Consumer One', emailVerifiedAt: verifiedAt },
    create: { email: 'consumer1@example.test', displayName: 'Consumer One', passwordHash: consumerPasswordHash('consumer1-demo'),
      emailVerifiedAt: verifiedAt } });
  const consumer2 = await db.user.upsert({ where: { email: 'consumer2@example.test' },
    update: { passwordHash: consumerPasswordHash('consumer2-demo'), status: 'ACTIVE', displayName: 'Consumer Two', emailVerifiedAt: verifiedAt },
    create: { email: 'consumer2@example.test', displayName: 'Consumer Two', passwordHash: consumerPasswordHash('consumer2-demo'),
      emailVerifiedAt: verifiedAt } });
  await db.userLocation.upsert({ where: { id: 'demo-home' }, update: { latitude: 41.0082, longitude: 28.9784 }, create: { id: 'demo-home', userId: demoUser.id, label: 'Istanbul demo home', latitude: 41.0082, longitude: 28.9784 } });
  const today = new Date(Date.now() - 60 * 60_000);
  today.setUTCMinutes(0, 0, 0);
  await db.priceObservation.updateMany({ where: { sourceType: 'DEMO_SEED', sourceName: 'Demo seed',
    observedAt: { gt: new Date() } }, data: { observedAt: today } });
  const observations: Array<{ sourceKey: string; retailerProductId: string; branchId: string; observedAt: Date; priceMinor: number; regularPriceMinor: number | null; promotionId: string | null;
    sourceType: 'DEMO_SEED'; sourceName: string; sourceIdentifier: string; rawPayloadRef: string; confidence: number; verificationStatus: 'DEMO' }> = [];
  const histories: Array<{ retailerProductId: string; day: Date; minPriceMinor: number; maxPriceMinor: number; sumPriceMinor: bigint; observationCount: number }> = [];

  for (const chainSpec of chains) {
    const chain = await db.storeChain.upsert({ where: { slug: chainSpec.slug }, update: { name: chainSpec.name }, create: { slug: chainSpec.slug, name: chainSpec.name } });
    const branch = await db.storeBranch.upsert({ where: { chainId_externalId: { chainId: chain.id, externalId: 'istanbul-demo' } }, update: {}, create: { chainId: chain.id, externalId: 'istanbul-demo', name: `${chainSpec.name} Istanbul Demo`, city: 'Istanbul', latitude: 41.0082, longitude: 28.9784 } });

    for (const item of catalog) {
      const category = await db.category.upsert({ where: { slug: item.slug }, update: {}, create: { slug: item.slug, name: item.category } });
      const brandSlug = item.brand.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]+/g, '-');
      const brand = await db.brand.upsert({ where: { slug: brandSlug }, update: {}, create: { slug: brandSlug, name: item.brand } });
      const product = await db.product.upsert({ where: { id: `${item.slug}-${brandSlug}` }, update: {}, create: { id: `${item.slug}-${brandSlug}`, name: item.name, normalizedName: item.name.toLocaleLowerCase('tr-TR'), ean: 'ean' in item ? item.ean : undefined, categoryId: category.id, brandId: brand.id } });
      const variant = await db.productVariant.upsert({ where: { productId_quantity_unit_packageCount: { productId: product.id, quantity: item.quantity, unit: item.unit, packageCount: 1 } }, update: {}, create: { productId: product.id, quantity: item.quantity, unit: item.unit, label: `${item.quantity} ${item.unit}`, packageCount: 1 } });
      const listing = await db.retailerProduct.upsert({ where: { chainId_externalId: { chainId: chain.id, externalId: product.id } }, update: { variantId: variant.id }, create: { chainId: chain.id, externalId: product.id, rawName: item.name, normalizedName: product.normalizedName, ean: product.ean, variantId: variant.id, matchConfidence: 1, reviewState: 'APPROVED' } });
      let promotionId: string | null = null;
      if (chainSpec.slug === 'migros' && item.brand === 'Finish') {
        const promotion = await db.promotion.upsert({ where: { id: 'demo-finish-migros' }, update: { startsAt: today, endsAt: new Date(today.getTime() + 7 * 86_400_000) }, create: { id: 'demo-finish-migros', chainId: chain.id, retailerProductId: listing.id, title: 'Demo Finish offer', startsAt: today, endsAt: new Date(today.getTime() + 7 * 86_400_000) } });
        promotionId = promotion.id;
      }
      for (let daysAgo = 60; daysAgo >= 0; daysAgo--) {
        const observedAt = new Date(today.getTime() - daysAgo * 86_400_000);
        const regularPriceMinor = Math.round(item.base * chainSpec.factor / 100) * 100;
        const variation = daysAgo === 0 ? 0 : ((daysAgo % 9) - 4) * 100;
        const isGreatDeal = daysAgo === 0 && chainSpec.slug === 'migros' && item.brand === 'Finish';
        const priceMinor = isGreatDeal ? 31900 : daysAgo === 45 && isGreatDeal === false && chainSpec.slug === 'migros' && item.brand === 'Finish' ? 29900 : regularPriceMinor + variation;
        const sourceKey = `seed:${chainSpec.slug}:${product.id}:${observedAt.toISOString().slice(0, 10)}`;
        observations.push({ sourceKey, retailerProductId: listing.id, branchId: branch.id, observedAt, priceMinor,
          regularPriceMinor: isGreatDeal ? regularPriceMinor : null, promotionId: isGreatDeal ? promotionId : null,
          sourceType: 'DEMO_SEED', sourceName: 'Demo seed', sourceIdentifier: 'database/seed.ts',
          rawPayloadRef: sourceKey, confidence: 1, verificationStatus: 'DEMO' });
        histories.push({ retailerProductId: listing.id, day: observedAt, minPriceMinor: priceMinor, maxPriceMinor: priceMinor, sumPriceMinor: BigInt(priceMinor), observationCount: 1 });
      }
    }
  }
  const result = await db.priceObservation.createMany({ data: observations, skipDuplicates: true });
  const rollups = await db.priceHistory.createMany({ data: histories, skipDuplicates: true });
  const dishwasher = await db.category.findUniqueOrThrow({ where: { slug: 'dishwasher-tablets' } });
  const oliveOil = await db.category.findUniqueOrThrow({ where: { slug: 'olive-oil' } });
  await db.userNeed.upsert({ where: { id: 'consumer1-dishwasher-tablets' },
    update: { userId: consumer1.id, categoryId: dishwasher.id, title: 'Dishwasher tablets',
      constraints: { preferredBrands: ['Finish'], minimumCount: 40, allowAlternatives: false }, active: true },
    create: { id: 'consumer1-dishwasher-tablets', userId: consumer1.id, categoryId: dishwasher.id,
      title: 'Dishwasher tablets', constraints: { preferredBrands: ['Finish'], minimumCount: 40, allowAlternatives: false } } });
  await db.userNeed.upsert({ where: { id: 'consumer2-olive-oil' },
    update: { userId: consumer2.id, categoryId: oliveOil.id, title: 'Olive oil',
      constraints: { preferredBrands: ['Komili'], minimumVolumeMl: 1000, allowAlternatives: true }, active: true },
    create: { id: 'consumer2-olive-oil', userId: consumer2.id, categoryId: oliveOil.id,
      title: 'Olive oil', constraints: { preferredBrands: ['Komili'], minimumVolumeMl: 1000, allowAlternatives: true } } });
  await db.dataSource.upsert({ where: { slug: 'local-poc-fixture' }, update: {
    name: 'Local POC fixture feed',
    owner: 'Market Tasarruf Asistani development fixtures',
    connectorType: 'JSON',
    authorizationStatus: 'AUTHORIZED',
    onboardingStatus: 'APPROVED',
    ownerContact: 'fixtures@market.local',
    permittedCommercialUse: false,
    allowedDataRetentionDays: 30,
    geographicCoverage: { country: 'TR', fixture: true },
    credentialRequirements: 'None. Local fixture only.',
    feedSpecificationUrl: 'fixture://poc-prices.json',
    feedSpecification: { format: 'JSON', rows: 'fixtures/poc-prices.json' },
    enabled: true,
    scheduleEveryMs: Number(process.env.INGESTION_DEMO_SCHEDULE_MS ?? 60_000),
    freshnessHours: 168,
    timeoutMs: 30_000,
    maxAttempts: 3,
    fictional: true,
    operationalStatus: 'IDLE',
    config: { localPath: new URL('../../../fixtures/poc-prices.json', import.meta.url).pathname,
      sourceUrl: 'fixture://poc-prices.json' },
    notes: 'Development-only fixture. It is deterministic, approved for local testing, and not authoritative Turkish supermarket coverage.',
  }, create: {
    slug: 'local-poc-fixture',
    name: 'Local POC fixture feed',
    owner: 'Market Tasarruf Asistani development fixtures',
    connectorType: 'JSON',
    authorizationStatus: 'AUTHORIZED',
    onboardingStatus: 'APPROVED',
    ownerContact: 'fixtures@market.local',
    permittedCommercialUse: false,
    allowedDataRetentionDays: 30,
    geographicCoverage: { country: 'TR', fixture: true },
    credentialRequirements: 'None. Local fixture only.',
    feedSpecificationUrl: 'fixture://poc-prices.json',
    feedSpecification: { format: 'JSON', rows: 'fixtures/poc-prices.json' },
    enabled: true,
    scheduleEveryMs: Number(process.env.INGESTION_DEMO_SCHEDULE_MS ?? 60_000),
    freshnessHours: 168,
    timeoutMs: 30_000,
    maxAttempts: 3,
    fictional: true,
    operationalStatus: 'IDLE',
    config: { localPath: new URL('../../../fixtures/poc-prices.json', import.meta.url).pathname,
      sourceUrl: 'fixture://poc-prices.json' },
    notes: 'Development-only fixture. It is deterministic, approved for local testing, and not authoritative Turkish supermarket coverage.',
  } });
  console.log(JSON.stringify({ listings: catalog.length * chains.length, newObservations: result.count,
    newDailyRollups: rollups.count, dataSource: 'local-poc-fixture' }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  seedDatabase().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); });
}
