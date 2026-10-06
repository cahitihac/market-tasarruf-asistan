# User Needs API (Phase 4)

The local MVP uses the seeded `demo@market.local` user. Authentication is not implemented yet; keep the API bound to loopback. All requests and responses are JSON. `POST /needs` accepts a generic name and an optional category slug. Category slugs accept underscores or hyphens. If category is omitted, the API infers an exact known category name such as `Olive oil` or `Coffee`.

```sh
curl -X POST http://127.0.0.1:3001/needs \
  -H 'content-type: application/json' \
  --data '{"name":"Dishwasher tablets","category":"dishwasher_tablets","preferredBrands":["Finish"],"alternativeBrands":["Fairy"],"minimumCount":40,"allowAlternatives":true}'
```

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/needs` | Create a need; `201` on success |
| `GET` | `/needs` | List active needs |
| `GET` | `/needs/:id` | Retrieve one active need |
| `PATCH` | `/needs/:id` | Update supplied fields |
| `DELETE` | `/needs/:id` | Archive a need; returns `204` |
| `GET` | `/needs/:id/offers` | Return ranked current offers with price history and deal score |

Supported constraints are `preferredBrands`, `alternativeBrands`, `excludedBrands`, `minimumQuantity` (`{amount,unit}`), `minimumCount`, `minimumVolumeMl`, `minimumWeightGrams`, `maximumUnitPriceMinor`, `allowAlternatives`, and `maximumStoreDistanceKm`. `allowAlternatives` defaults to true. Monetary values are integer kuruş. Unit price is per piece, litre, or kilogram according to the product unit. A maximum unit price is a hard filter. For distance limits, the demo user has a seeded Istanbul location. Offers without a known distance cannot satisfy a distance limit.

Matching uses exact category when supplied, otherwise a deterministic category/name match. Brand, package, unit price, and distance constraints are evaluated without AI. Preferred brands receive a higher match score than alternatives; deal quality contributes 40% of final rank and can change their order. Only approved canonical mappings and current TRY observations from the last 72 hours appear. Each offer includes canonical and retailer products, retailer/branch, current and regular prices, unit price, 7/30/90-day statistics, deal score, recommendation, reasons, match score and reasons, and final rank.

`400` means invalid input, `422` means an unknown explicit category, and `404` means the active need was not found. Archived needs remain in DynamoDB for future audit and are hidden from active reads.
