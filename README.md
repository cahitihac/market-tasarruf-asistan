# Market Tasarruf Asistanı

Production-oriented MVP foundation for a personal grocery savings assistant in Turkey. This repository covers infrastructure, schema and demo seed, deterministic price intelligence, User Needs with ranked offers, persistent background deal evaluation, an Expo mobile app, file/brochure ingestion POCs, and an internal admin review dashboard. Seeded retailer prices remain fictional sample data.

## Prerequisites

Node 24, pnpm 10, Docker Compose. Install pnpm with `corepack enable` if needed. On macOS, if Docker Desktop's CLI is not on your shell path, run `export PATH="$HOME/.docker/bin:$PATH"` in that shell before the commands below.

```sh
cp .env.example .env
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:verify
pnpm dev
```

`GET http://127.0.0.1:3001/health` reports process health. `/ready` checks PostgreSQL.
Phase 4 need CRUD and ranked offers are documented in [docs/NEEDS_API.md](docs/NEEDS_API.md).
Phase 5 worker, alert policy and persisted API endpoints are documented in [docs/DEAL_EVALUATION.md](docs/DEAL_EVALUATION.md). In a separate terminal, run `pnpm --filter @market/worker dev` to start scheduled evaluation; run `pnpm --filter @market/worker trigger` to enqueue a manual evaluation and wait for its result.
Phase 6 mobile setup, emulator addresses, and the live UI walkthrough are documented in [docs/MOBILE_APP.md](docs/MOBILE_APP.md).
Phase 7 CSV/JSON connectors, provenance, deterministic matching, deduplication, and freshness are documented in [docs/DATA_INGESTION.md](docs/DATA_INGESTION.md).
Phase 9 brochure ingestion is documented in [docs/BROCHURE_INGESTION.md](docs/BROCHURE_INGESTION.md).
Phase 10 admin review dashboard is documented in [docs/ADMIN_DASHBOARD.md](docs/ADMIN_DASHBOARD.md).
Phase 12 consumer authentication, session handling, and per-user isolation are documented in [docs/CONSUMER_AUTH.md](docs/CONSUMER_AUTH.md).
Phase 13 account lifecycle, email verification, password reset, session management, and account deletion are documented in [docs/ACCOUNT_LIFECYCLE.md](docs/ACCOUNT_LIFECYCLE.md).

```sh
pnpm ingest:prices fixtures/poc-prices.json --source-name phase7-poc-manual
pnpm ingest:brochure fixtures/carrefour-example.pdf
pnpm brochure:review list
pnpm admin:dev
```

The seed is safe to rerun and creates 55 demo retailer listings across Migros, BIM, A101, CarrefourSA and SOK, each with 61 days of sample observations and daily rollups. It intentionally includes a 319 TRY Finish offer at Migros. `pnpm db:verify` checks the chains, counts and special offer against PostgreSQL. These values are fictional and should never be presented as live prices.

Development consumer accounts are seeded for local testing:

- `consumer1@example.test` / `consumer1-demo`
- `consumer2@example.test` / `consumer2-demo`

Newly registered local users start with an unverified email. The development email provider exposes recent verification and reset links at `GET http://127.0.0.1:3001/auth/dev-email-links` while the API is running. Use those links/tokens to test email verification and password reset without an external provider.

Use these in Expo Web after starting the API, worker, and mobile app:

```sh
pnpm dev
pnpm --filter @market/worker dev
EXPO_PUBLIC_API_URL=http://127.0.0.1:3001 pnpm --filter @market/mobile web
```

```sh
pnpm typecheck
pnpm lint
pnpm test
```

See [architecture](docs/ARCHITECTURE.md), [domain model](docs/DOMAIN_MODEL.md), and [implementation plan](docs/IMPLEMENTATION_PLAN.md).
