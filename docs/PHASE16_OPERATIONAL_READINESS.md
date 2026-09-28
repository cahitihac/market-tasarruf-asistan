# Phase 16 production data readiness

Date: 2026-09-25

## Development environment fix

Root `pnpm typecheck`, `pnpm lint` and `pnpm test` previously failed inside Turbo with:

```text
Unable to find package manager binary: cannot find binary path
```

The project already declares `packageManager: "pnpm@10.17.1"`, but the local environment exposed pnpm only through
Corepack. Turbo shells into package tasks and expects a `pnpm` binary to be discoverable. The fix is to add the same
pnpm version as a root dev dependency:

```json
"pnpm": "10.17.1"
```

This creates `node_modules/.bin/pnpm` without changing the declared package-manager version.

## First authorized source checklist

Do not enable a real source until all required items are present in the Data Source registry.

Business/legal:

- Legal owner and operational contact.
- Written authorization status and effective dates.
- Explicit permitted commercial use.
- Display/redistribution rights for consumer-facing price comparison.
- Allowed retention window for raw records and normalized observations.
- Geographic coverage: country, cities, stores/branches and online coverage.
- Attribution, audit, deletion and correction obligations.
- SLA or support path for feed outages and schema changes.

Technical:

- Documented API/feed specification, not browser traffic or private app endpoints.
- Authentication method and credential storage location as environment variables.
- Rate limits, retry guidance and `Retry-After` behavior.
- Pagination, incremental sync and full backfill rules.
- Stable product identifiers: EAN/GTIN, retailer product id, package size/unit/count.
- Branch/store identity, location and online-vs-branch semantics.
- Currency, tax inclusion, observed time, valid-from/to promotion windows.
- Error schema and partial-failure behavior.
- Test fixture and staging credentials.

Operational:

- Freshness threshold agreed with source owner.
- Expected minimum record count and anomaly thresholds.
- Review workflow owner for unmatched/anomalous records.
- External operational alert recipient.
- Pause/resume and credential-rotation runbook tested locally.

## Current real-source status

No authoritative Turkish grocery-price source credentials or written commercial usage rights are present in this
workspace.

Existing research still classifies:

- Market Fiyatı / TÜBİTAK as high-value but `NEEDS_PERMISSION`; public access is not a reusable API grant.
- Retailer web/app prices as `NEEDS_PERMISSION`; scraping or reverse engineering is not allowed.
- Affiliate feeds as potentially suitable only after publisher approval and merchant feed rights.
- Open Prices as acceptable for POC/community provenance, but not authoritative production grocery coverage.

The codebase now includes an `AuthorizedFeedSpecification` adapter contract in
`packages/ingestion/src/authorized-feed.ts`. It fails closed until authorization, commercial use, approved onboarding
and a documented feed specification are available.

## Required information from the source owner

Send these before implementation of the first real connector:

1. Legal owner name and technical contact.
2. Signed or written authorization for this application's use case.
3. Commercial display/reuse permission and attribution text.
4. Retention period for raw feed rows and normalized prices.
5. API/feed documentation, sample payloads and schema changelog process.
6. Credentials or sandbox credentials, with the environment variable names to use.
7. Rate limits and retry/backoff instructions.
8. Geographic and branch coverage.
9. Expected daily/hourly record counts.
10. Support/escalation path for outages, bad data and credential rotation.
