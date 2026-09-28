# Deal engine

All inputs are integer minor units. The pure engine computes 7/30/90-day averages, all-time min/max, current-price percentile, and difference from averages. Windows use UTC instants and exclude the current observation. Empty windows return `null`.

The initial score starts at 45. Discounts against 30- and 90-day means, closeness to historical minimum, verified promotion discount, unit-price advantage, brand preference, and distance adjust the score. The result is clamped to 0–100. Scores 0–30 are `BAD_PRICE`, 31–50 `NORMAL_PRICE`, 51–70 `GOOD_PRICE`, 71–85 `BUY`, and 86–100 `GREAT_DEAL`. The user-facing BUY/WAIT action is `BUY` for the top two bands, otherwise `WAIT`.

Missing history contributes no discount points. Excluded brands and stores beyond a hard maximum distance receive score zero. Explanations are generated from the same numeric evidence used for the score; no language model performs price arithmetic. Thresholds are passed as configuration so later calibration does not change the implementation.
