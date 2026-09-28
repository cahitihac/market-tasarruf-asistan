# Persistent deal evaluation

The API and worker share `@market/evaluation`. The worker uses BullMQ's `upsertJobScheduler` to register one `active-needs` schedule, every five minutes by default. Set `DEAL_EVALUATION_INTERVAL_MINUTES` to change it. Start the worker with `corepack pnpm --filter @market/worker dev`; enqueue an immediate run with `corepack pnpm --filter @market/worker trigger`.

Each run gets an `EvaluationRun` row and structured start/finish logs. Needs are evaluated independently, so one bad need is recorded while other needs commit. A run with failures is reported as a failed BullMQ job and retried at most three times with exponential backoff. The per-need transaction takes a PostgreSQL advisory lock, so overlapping jobs do not create duplicate opportunities.

Every matching current offer gets an immutable `Deal` snapshot containing the price, match score, price statistics, recommendation and reasons. Its unique `snapshotKey` combines the need, observation and a hash of the need's matching criteria. Unchanged reruns reuse the same row. A changed need or price creates a new snapshot; the old active row becomes `SUPERSEDED` if its listing still matches, or `EXPIRED` if it no longer does. Archived needs' active deals expire at the next run. `GET /deals` returns active BUY and GREAT_DEAL opportunities; `GET /deals/:id` can retrieve historical snapshots.

An alert is allowed only for BUY or GREAT_DEAL. The first qualifying opportunity alerts. Later observations alert only when the price improves by at least 8%, the label upgrades from BUY to GREAT_DEAL, or an expired opportunity returns after 24 hours. An unchanged observation never alerts twice. `Alert.dedupeKey` is unique and `Notification.alertId` is unique, giving database-level duplicate protection. Each alert creates one persisted notification. These thresholds are deterministic MVP policy constants.

The development API uses the seeded demo user. Endpoints: `GET /deals`, `GET /deals/:id`, `GET /alerts`, `GET /alerts/:id`, `GET /notifications`, and `PATCH /notifications/:id/read`. Notifications are stored in PostgreSQL; push delivery is outside this phase.

The mobile app can request `GET /deals?all=true` to include all active price labels and `GET /deals/:id/history` for recent observations of the deal's listing and branch. The default `/deals` response continues to return BUY and GREAT_DEAL opportunities.
