# Architecture

The MVP is a TypeScript monorepo. `apps/api` is a Fastify modular monolith; a later `apps/worker` will run BullMQ jobs against the same domain and database packages. PostgreSQL is the source of truth. Redis is reserved for the job queue, never for canonical prices. Mobile and admin clients will call the REST API, not the database.

```
mobile / admin -> Fastify API -> domain services -> Prisma -> PostgreSQL
                                      ^
retailer connectors -> worker --------+------> Redis/BullMQ
brochure providers -> review queue ---+
```

Phases 1–4 implement infrastructure, schema, seed data, pure price/deal logic, and User Need CRUD with ranked current offers. Periodic evaluation, mobile, admin, and brochure extraction remain later phases.

## Boundaries

- `packages/domain`: pure deterministic normalization, statistics, promotion math, scoring. It never imports Prisma or calls AI.
- `packages/database`: Prisma schema, migrations, generated client and idempotent demo seed.
- `packages/contracts`: Zod transport schemas; HTTP layer validates at boundaries.
- `packages/config`: environment parsing shared by processes.
- `apps/api`: composition root, HTTP, logging, User Need persistence and offer queries. Readiness checks PostgreSQL.
- Future retailer adapters return raw products, prices, promotions, and branches. Ingestion maps them to canonical products with EAN first, then normalized attributes. Ambiguous matches go to review.

Money is stored as integer minor units (kuruş) and currency. Historical observations are immutable. `PriceHistory` is a derived aggregate, not a second raw fact; it can be rebuilt from observations. Scores are computed from the current observation and earlier observations only, with a configurable 90-day horizon. Seeded prices are fictional demo data, not current retailer claims.

## Operational assumptions and risks

- A local development user is seeded. Authentication and authorization are required before any nonlocal deployment.
- PostgreSQL and Redis run in Docker Compose; Node services run on the host for fast iteration. Docker is needed to verify the complete local database flow.
- A retailer may have an online catalog price and branch prices. A nullable branch identifies chain-wide or online observations; delivery fees and loyalty constraints must later be modeled before alerting.
- Retailer names and prices in the seed are illustrative. No scraping is used.
- Exact EAN matching is reliable only when the code is supplied and valid. Name matching can be uncertain and must surface confidence and review state.
- Price statistics need enough observations; sparse histories yield `null` averages and conservative scores.
- At scale, latest-price and history reads need indexing or materialized aggregates. Keep all raw observations for audit.

## Local run

Use Node 24, pnpm 10, and Docker Compose. Copy `.env.example` to `.env`, then run `pnpm install`, `docker compose -f infra/docker-compose.yml up -d`, `pnpm db:migrate`, `pnpm db:seed`, and `pnpm dev`. See the root README for validation commands.
