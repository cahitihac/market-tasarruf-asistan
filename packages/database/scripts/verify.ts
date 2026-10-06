import { config as loadDotEnv } from 'dotenv';
import { database as db } from '../src/index.js';

loadDotEnv({ path: new URL('../../../.env', import.meta.url).pathname });

async function main() {
  const chains = await db.storeChain.findMany({ select: { slug: true }, orderBy: { slug: 'asc' } });
  const listings = await db.retailerProduct.count();
  const observations = await db.priceObservation.count();
  const rollups = await db.priceHistory.count();
  const demoLocation = await db.userLocation.findUnique({ where: { id: 'demo-home' }, select: { latitude: true, longitude: true } });
  const consumerUsers = await db.user.findMany({ where: { email: { in: ['consumer1@example.test', 'consumer2@example.test'] } },
    select: { email: true, passwordHash: true, needs: { select: { id: true } } } });
  const finishOffer = await db.priceObservation.findFirst({
    where: {
      priceMinor: 31900,
      retailerProduct: {
        chain: { slug: 'migros' },
        variant: { product: { name: 'Finish Quantum 72 tablets' } },
      },
    },
    select: { priceMinor: true, currency: true, observedAt: true, regularPriceMinor: true, promotionId: true },
    orderBy: { observedAt: 'desc' },
  });
  const expected = ['a101', 'bim', 'carrefoursa', 'migros', 'sok'];
  const chainSlugs = chains.map(chain => chain.slug);
  const checks = {
    chains: expected.every(slug => chainSlugs.includes(slug)),
    listings: listings >= 55,
    observations: observations >= 55 * 61,
    rollups: rollups >= 55 * 61,
    demoLocation: demoLocation?.latitude === 41.0082 && demoLocation.longitude === 28.9784,
    consumerAuth: consumerUsers.length === 2 && consumerUsers.every(user => user.passwordHash?.startsWith('scrypt$') && user.needs.length > 0),
    finishOffer: finishOffer?.priceMinor === 31900 && finishOffer.currency === 'TRY' &&
      finishOffer.regularPriceMinor === 41000 && finishOffer.promotionId !== null,
  };
  console.log(JSON.stringify({ checks, chains, listings, observations, rollups, demoLocation,
    consumerUsers: consumerUsers.map(user => ({ email: user.email, seededNeeds: user.needs.length })), finishOffer }, null, 2));
  if (Object.values(checks).some(passed => !passed)) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); });
