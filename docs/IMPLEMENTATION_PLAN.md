# Implementation plan

1. **Repository and runtime (this pass):** pnpm/Turbo workspace, shared TypeScript config, Fastify health API, Compose PostgreSQL/Redis, environment examples. Gate: install, typecheck, lint, API health.
2. **Database (this pass):** canonical and retailer catalog model, observations, supporting future entities, initial migration, reproducible Turkish demo seed with several weeks of prices. Gate: Prisma validate, migration and seed on a running PostgreSQL instance.
3. **Price intelligence (this pass):** deterministic normalization, price statistics, promotion calculation, configurable deal score with reasons. Gate: focused unit tests, typecheck, lint.
4. **Needs and offers:** validated needs CRUD, deterministic need matching, latest offers and historical chart endpoints. Gate: API integration tests.
5. **Worker and alerts:** BullMQ scheduler, evaluate active needs, transactional deduplication, stored notifications and ingestion metrics. Gate: replay and idempotency tests.
6. **Expo app:** needs, offers, deal details and notifications from the API. Gate: first vertical demo on simulator/device.
7. **Admin:** Next.js views for catalog, price changes, failed runs, review and alerts, behind authorization.
8. **Brochures:** feature-flagged extraction provider contract, mock provider, strict Zod validation, review workflow.
9. **AI extraction:** configurable current provider/model and structured output; never used for arithmetic.
10. **Retailer feeds:** authorized connector implementations, source-specific monitoring and rate limits.

The first demonstration becomes complete after phase 6. No real retailer integration or push notification is required for that milestone.

## Status after phases 1–3

- Phase 1: workspace, API health/readiness, Compose services and environment configuration implemented.
- Phase 2: Prisma schema, initial SQL migration and idempotent demo seed implemented. The seed has 55 retailer listings and 61 daily observations per listing, including a Migros Finish offer at 319 TRY and prior observations around 410 TRY.
- Phase 3: pure deterministic normalization, statistics, promotion math and deal scoring implemented with focused tests.
- Validation: Docker Compose PostgreSQL and Redis reached healthy status. The Prisma migration applied, the seed inserted 3,355 observations and 3,355 daily rollups, and a second seed run inserted zero duplicates. Direct SQL and `pnpm db:verify` confirmed the five chains, 55 listings and the Migros Finish 319 TRY offer; the prior 60 observations averaged 408.17 TRY. Live API `/health` and `/ready` returned HTTP 200. TypeScript typecheck, ESLint, Prisma schema validation and all eight Vitest tests passed without Turbo cache.
- Phase 4: validated need CRUD, deterministic candidate matching and ranked offer/history responses implemented without a schema migration. The API uses the seeded local user and read-time scoring. Live manual CRUD and offer checks passed: a dishwasher-tablet need returned ten offers, with the 319 TRY Migros Finish offer ranked first; raising the minimum count to 80 returned zero offers. `db:verify`, migration status, typecheck, lint, and all 19 tests passed. The first mobile vertical demo still needs phases 5–6.
- Next: phase 5 should add scheduled need evaluation and deduplicated stored alerts. This has not started.
