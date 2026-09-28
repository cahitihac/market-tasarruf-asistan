# Data ingestion

Phase 7 adds a connector boundary for supplied grocery price data. Imported observations use the same canonical
catalog, price history, User Need matcher, DealScore, worker, alert, notification, API, and mobile application as
the fictional seed. There is no separate deal engine for imported data.

## Connector architecture

`PriceSourceConnector` describes its source and capabilities and supplies price records through `getPrices()`.
Products, promotions, and branches are optional capabilities for future sources.

Included connectors:

- `MockPriceConnector`: deterministic in-memory data for tests and development
- `CsvPriceConnector`: parsed CSV records
- `JsonPriceConnector`: JSON arrays or `{ "rows": [] }` documents
- `fileConnector`: selects the CSV or JSON implementation by file extension
- `Open Prices`: documented public API connector for a bounded, open-data Turkey POC; see
  [REAL_DATA_SOURCES.md](./REAL_DATA_SOURCES.md)

Future official APIs and public datasets should implement the same interface. Retailer-specific transport and
authentication stay inside the connector. They do not belong in the domain package.

## Supported records

CSV headers and JSON object keys use:

`retailer`, `branch`, `externalProductId`, `productName`, `ean`, `brand`, `category`, `packageQuantity`,
`packageUnit`, `packageCount`, `currentPrice`, `regularPrice`, `promotionText`, `validFrom`, `validTo`, and
`observedAt`.

Prices are decimal Turkish-lira amounts with at most two decimal places. Timestamps must be ISO 8601 values with
an offset. Promotion text requires a valid start and end time.

## Import pipeline

Each row passes through:

1. Zod validation and amount conversion.
2. Retailer and branch resolution.
3. Deterministic canonical-product matching.
4. Retailer-product create or update.
5. Promotion persistence when validity dates are supplied.
6. `PriceObservation` and daily `PriceHistory` persistence.
7. Per-row outcome persistence on the owning `IngestionRun`.

A malformed or unmatched row is recorded and processing continues. The run becomes `PARTIAL` when useful rows
were imported alongside failures or unmatched rows. Fatal connector failures make the run `FAILED`.

## Product matching

Matching priority is:

1. Valid exact EAN with matching package attributes.
2. Existing retailer and external-product mapping with matching package attributes.
3. Normalized brand, category, quantity, unit, package count, and product attributes.

Attribute confidence must be at least 0.85. Ambiguous, low-confidence, invalid-EAN, and package-conflict rows are
stored as `UNMATCHED`; the importer does not guess. Matching reuses the domain normalization code.

## Provenance

Every imported observation records:

- source type and name
- source identifier and optional source URL
- external retailer-product identifier
- retrieval and observation timestamps
- ingestion run ID
- raw payload checksum and row reference
- match confidence
- verification status
- retailer product, branch, and promotion relations

Matched payloads are referenced by checksum and row number rather than copied. Raw JSON is retained only for
unmatched and failed rows that require review.

## Deduplication

The importer derives a deterministic `sourceKey` from source identity, retailer, external product identity or
normalized product package, branch, observation timestamp, current price, and regular price. `sourceKey` has a
database unique constraint. Replaying the same named source and records creates a new auditable run whose rows are
marked `DUPLICATE`, without adding observations or daily-history counts.

Use a stable `--source-name` for recurring versions of the same authorized feed.

## Freshness

`PRICE_FRESHNESS_HOURS` defaults to 72 hours. Price observations are classified as `CURRENT`, `STALE`, or
`FUTURE`. Only current observations enter offer matching and DealScore. Promotions are classified as `UPCOMING`,
`ACTIVE`, `EXPIRED`, or `NONE`; a promotion-linked observation is eligible only while the promotion is active.
This prevents stale or expired offers from producing `GREAT_DEAL` recommendations.

## CLI

From the repository root:

```sh
pnpm ingest:prices fixtures/poc-prices.json --source-name phase7-poc-manual
pnpm ingest:prices path/to/prices.csv --source-name authorized-retailer-feed --source-url https://example.test/feed
pnpm ingest:open-prices --limit 25
```

The command prints the run ID, status, processed, matched, unmatched, created-observation, duplicate, promotion,
and failure counts. `fixtures/poc-prices.json` includes an EAN match, text matches, an unmatched product, a
promotion, a stale observation, an in-file duplicate, and a malformed row.

## Adding a connector

1. Implement `PriceSourceConnector` and declare supported capabilities.
2. Provide a stable source name and identifier, retrieval time, and payload checksum.
3. Return raw records using the supported record contract or add an adapter inside the connector.
4. Pass the connector to `ingestPrices`.
5. Add contract, provenance, retry, malformed-record, and partial-failure tests.

Official credentials must come from environment or secret management and must never be persisted in provenance.
Brochure extraction and administrative review interfaces are outside Phase 7.
