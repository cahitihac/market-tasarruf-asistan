# DealScore v2

DealScore is an internal, deterministic price-quality metric. Consumer surfaces show the recommendation, price,
unit price, historical comparison, and explanation instead of the numeric score.

## Why v1 saturated

V1 started at 45 and allowed positive inputs totaling 125 before clamping to 100. The 30-day comparison,
90-day comparison, historical-low proximity, promotion, unit-price advantage, and preferred-brand bonus could
therefore make materially different prices indistinguishable at 100.

## V2 formula

V2 starts at 50 and uses:

- 90-day comparison: `clamp(difference × 0.8, -20, 20)`
- 30-day comparison: `clamp(difference × 0.4, -8, 8)`
- historical position: +8 at or below the prior minimum, +6 within 5%, +4 within 10%, and -8 over 30% above
- promotion discount: `clamp(discount × 0.2, 0, 5)`
- unit-price advantage: `clamp(advantage × 0.25, -5, 5)`
- exceptional-low bonus: +5 when the price is at or below the prior historical minimum, at least 30% below the
  90-day average, and supported by at least 30 prior samples

The rounded result is clamped to 0–100. Brand preference and distance are matching and eligibility concerns;
they no longer alter price quality. The score version is included in evaluation snapshot identity so existing
offers are recalculated once without duplicating an alert for the same observation.

## Recommendation thresholds

V2 uses:

- 0–30: `BAD_PRICE`
- 31–50: `NORMAL_PRICE`
- 51–65: `GOOD_PRICE`
- 66–82: `BUY`
- 83–100: `GREAT_DEAL`

The upper thresholds moved from 70/85 to 65/82 because the positive ranges were deliberately compressed.
This retains the intended recommendation for strong offers while preserving meaningful separation inside the
upper range. `BUY` and `GREAT_DEAL` remain the only alert-eligible recommendations.

## Reference examples

- normal price: 45 → 50
- representative good price: 56 → 60
- representative BUY: 78 → 70
- Finish 319 TL offer: 100 → 84 (`GREAT_DEAL`)
- Finish 279 TL exceptional historical low: 100 → 96 (`GREAT_DEAL`)

Offer ranking remains `60% matchScore + 40% DealScore`. Removing preferred-brand credit from DealScore avoids
counting brand preference twice while preserving it through matchScore.
