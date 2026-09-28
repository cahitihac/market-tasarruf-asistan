# Admin Review Dashboard

Phase 10 adds an internal dashboard for operating brochure ingestion and review. It uses development/admin assumptions only; production authentication is intentionally out of scope.

## Running

Start the API and admin app in separate terminals:

```bash
corepack pnpm --filter @market/api dev
corepack pnpm --filter @market/admin dev
```

The admin app runs on `http://127.0.0.1:3002` and calls the API from `NEXT_PUBLIC_API_BASE_URL` or `http://127.0.0.1:3001`.

## Screens

- Dashboard: pending reviews, failed runs, unmatched products, imported prices, promotions, stale data, recent brochures and alerts.
- Ingestion Runs: CSV/JSON/Open Prices runs plus brochure extraction runs.
- Brochures: retailer, source, authorization status, status, validity, imports and offer counts.
- Review Queue: extracted offer values, source preview metadata, candidate matches, canonical product search, approve/match/reject actions.
- Products: searchable canonical catalog and variants.
- Retailer Products: retailer mappings, EAN, canonical product, confidence and observation count.
- Prices: observation provenance, source type, source authorization and verification status.
- Promotions: title/raw text, validity, loyalty and modeled condition rows.
- Deals, Alerts, Notifications: existing downstream operational outputs.

## Admin API

The API exposes internal endpoints under `/admin`:

- `GET /admin/dashboard`
- `GET /admin/ingestion-runs`
- `GET /admin/ingestion-runs/:id`
- `GET /admin/brochures`
- `GET /admin/brochures/:id`
- `GET /admin/reviews`
- `GET /admin/reviews/:id`
- `POST /admin/reviews/:id/approve`
- `POST /admin/reviews/:id/match`
- `POST /admin/reviews/:id/reject`
- `GET /admin/products`
- `GET /admin/retailer-products`
- `GET /admin/prices`
- `GET /admin/prices/:id`
- `GET /admin/promotions`
- `GET /admin/deals`
- `GET /admin/alerts`
- `GET /admin/notifications`

Review mutations validate payloads and call the ingestion review service. The dashboard does not duplicate matching or price-creation business logic.

## Review Workflow

1. Import an authorized/manual brochure fixture.
2. Open Review Queue.
3. Inspect extracted values, raw extraction, brochure filename, page and source location.
4. Select a proposed candidate or search canonical products.
5. Approve, manually match, or reject.
6. Approved/matched offers create regular `PriceObservation` and `Promotion` rows with brochure provenance.

## Source Authorization

`Brochure.sourceAuthorizationStatus` records one of:

- `AUTHORIZED`
- `PUBLIC_DATA`
- `MANUAL_UPLOAD`
- `UNVERIFIED`
- `RESTRICTED`

The UI displays this beside brochure/review/price records. Successful extraction does not imply trusted or verified data.

## Preview Approach

The review screen displays filename, page number, source location and page image when `BrochurePage.imageRef` is present. It does not fake bounding boxes. Full local PDF page rasterization/OCR is still a Phase 11 candidate.
