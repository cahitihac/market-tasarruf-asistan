# Brochure Ingestion

Phase 9 adds a proof-of-concept path for authorized or manually supplied grocery brochures, flyers, PDFs, JPGs and PNGs. It feeds the existing price ingestion, matching, deal, alert and notification architecture. It does not make Open Prices a production dependency for Turkey.

## Architecture

Flow:

```text
Brochure / flyer
  -> local import CLI
  -> document preprocessing
  -> BrochureExtractionProvider
  -> Zod structured validation
  -> product normalization
  -> canonical product matching
  -> BrochureOffer
  -> PriceObservation / Promotion when accepted
  -> existing deal evaluation worker
  -> Deal / Alert / Notification
```

The brochure path persists brochure-specific provenance, then creates ordinary `PriceObservation` and `Promotion` rows only after deterministic validation and matching.

## Data Model

Phase 9 adds or completes:

- `Brochure`: retailer, source, source identifier, file hash, validity dates, import time and status.
- `BrochurePage`: page-level provenance for source location.
- `ExtractionRun`: provider, model/config version, raw output, counters and errors.
- `BrochureOffer`: normalized extracted offer, raw extraction, confidence, matching state and links to resulting price/promotion rows.
- `ReviewItem`: pending/approved/rejected/manual-match workflow for uncertain extraction or matching.

`PriceObservation.brochureOfferId` and `Promotion.brochureOfferId` keep approved prices traceable to the exact brochure offer.

## AI Provider Abstraction

`BrochureExtractionProvider` lives in `packages/ingestion/src/brochure-provider.ts`.

Providers accept loaded document content and return strict structured brochure data. The application selects a provider with environment variables:

```bash
BROCHURE_EXTRACTION_PROVIDER=mock
BROCHURE_EXTRACTION_PROVIDER=openai
OPENAI_API_KEY=...
BROCHURE_EXTRACTION_MODEL=gpt-5
```

If no OpenAI key is configured, the deterministic mock provider is used for tests and local POC work. The OpenAI provider uses the Responses API structured-output path and keeps the model name in env configuration.

## Extraction Schema

The validated output is defined in `packages/ingestion/src/brochure-schema.ts`.

Each offer attempts to extract retailer, product name, brand, EAN, package quantity/unit, current price, regular price, promotion text, loyalty requirement, multi-buy text, validity dates, page/source location and extraction confidence.

Raw AI output is never trusted directly. Zod validates structure, prices, confidence range and validity windows before anything is persisted as a price.

## Confidence Rules

Accepted automatically for the POC:

- known retailer
- clear current price
- valid package quantity/unit
- valid date window
- extraction confidence >= `0.85`
- successful canonical match by exact EAN, or a high-confidence deterministic normalized match

Review required:

- missing or uncertain price
- missing package size
- uncertain brand
- no match, ambiguous match or low-confidence match
- malformed extraction values

Expired brochures are filtered before price observation creation.

## Product Matching

The brochure flow reuses the Phase 7/8 deterministic matcher:

1. Exact EAN
2. Known retailer-product mapping when present
3. Normalized deterministic match
4. Candidate suggestions stored on `ReviewItem`

The LLM never makes the final authoritative canonical match when confidence is low.

## Promotions

Supported POC promotion structures:

- simple sale price
- regular price and current price
- percentage text when present
- loyalty-card requirement
- raw multi-buy text

Ambiguous promotion arithmetic is not invented. Raw promotion text is stored even when the condition is only partially modeled.

## Review Workflow

CLI operations:

```bash
corepack pnpm ingest:brochure ./fixtures/carrefour-example.pdf
corepack pnpm brochure:review list
corepack pnpm brochure:review approve <reviewItemId>
corepack pnpm brochure:review match <reviewItemId> <variantId>
corepack pnpm brochure:review reject <reviewItemId>
```

`approve` uses the stored proposed variant when available. `match` manually selects a canonical `ProductVariant`. Both create normal `PriceObservation` / `Promotion` rows. `reject` prevents the offer from entering the price pipeline.

## Duplicate Handling

Exact brochure files are deduplicated by `Brochure.fileHash`. Duplicate offers inside a brochure are deduplicated by a deterministic `BrochureOffer.sourceKey`. Approved offers create `PriceObservation.sourceKey` from the same source key and use duplicate-safe creation.

## Provenance

Every approved price can be traced through:

`PriceObservation -> BrochureOffer -> BrochurePage -> Brochure -> ExtractionRun`

Stored provenance includes source, source identifier, file hash, page/source location, raw extraction, normalized output, provider, model/config version and confidence.

## Local Demo

```bash
corepack pnpm --filter @market/database db:migrate
corepack pnpm --filter @market/database db:seed
corepack pnpm ingest:brochure ./fixtures/carrefour-example.pdf
corepack pnpm brochure:review list
corepack pnpm brochure:review match <reviewItemId> <variantId>
corepack pnpm --filter @market/worker trigger
```

The fixture is mock data only. It includes Finish dishwasher tablets, olive oil, coffee, a simple discount, a loyalty promotion, a multi-buy text, an ambiguous item, a poor extraction and a duplicate offer.
