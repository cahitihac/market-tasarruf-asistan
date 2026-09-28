# Domain model

`Product` is the canonical identity and owns brand, category, normalized name, and EAN when known. `ProductVariant` captures package size and unit for comparable buying units. `RetailerProduct` is a retailer's listing, with its own title, external ID, and optional mapping to a canonical variant. A missing or uncertain mapping is retained for manual review, not silently merged.

`StoreChain` owns `StoreBranch`. `PriceObservation` is an append-only retailer listing price at a timestamp, optionally scoped to a branch and promotion. It records regular and promotional prices separately. `PriceHistory` stores rebuildable daily rollups. `Promotion` and `PromotionCondition` capture validity, loyalty, and conditions.

`User` owns `UserLocation`, `UserNeed`, and `UserProductPreference`. Needs express category and attribute constraints as structured data. Future matching produces a candidate list; scoring uses the relevant price history, preference, and distance. `Deal` records a scored offer; `Recommendation` records a user's decision for that deal. `Alert` deduplicates a user, need, deal, and recommendation event; `Notification` is the delivery record.

In Phase 4, a need's typed constraints are stored in `UserNeed.constraints` JSON and validated at the API boundary. The category relation is resolved from an explicit slug or exact generic name. `UserProductPreference` remains available for future cross-need preferences. The offers endpoint computes matches and scores on read; it does not persist `Deal` or `Recommendation` rows yet.

`IngestionRun` records source, run status, counts, timestamps, and errors. `Brochure` stores source metadata and extraction state; `BrochureOffer` preserves raw extraction, normalized output, confidence, and review state. Low-confidence extracted offers cannot create production promotions without review.

## Invariants

- `PriceObservation.priceMinor >= 0`, `regularPriceMinor >= priceMinor` when both are known, and ISO currency is explicit. Domain code uses integer minor units.
- EAN is unique when present on a canonical product. A retailer listing is unique per chain and external ID.
- Multiple observations can exist per listing and timestamp only if they refer to different branch scopes; ingestion uses a source observation key for idempotence.
- Statistics exclude the current observation and later observations, so a new deal does not dilute its comparison baseline.
- Promotional discount is based on a valid regular price, with no double counting of stacked offers.
- Recommendation thresholds are ordered and configurable. Sparse history does not imply a bargain.
