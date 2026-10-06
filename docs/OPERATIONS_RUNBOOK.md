# Operations runbook

## Onboard a new data source

1. Create or update a `DataSource` registry entry with owner, contact, authorization status, retention, geographic
   coverage, credential requirements and feed specification.
2. Keep `enabled=false` while authorization or documentation is incomplete.
3. Store credentials only in environment variables or protected deployment configuration.
4. Set `onboardingStatus=APPROVED` only after business and technical review.
5. Set `permittedCommercialUse=true` only when written permission allows this product use case.
6. Enable the source, run a manual ingestion, inspect review backlog and verify freshness.

## Diagnose failed ingestion

1. Open Admin → Data Sources and check the source status, latest run and failed jobs.
2. Open Admin → Ingestion Runs for row counts, failures and raw row reasons.
3. Open Admin → Ingestion Reviews for failed or unmatched CSV/JSON/API records.
4. Check `OperationalAlert` entries for repeated failures, record-count drops or stale sources.
5. Verify credentials, feed URL, rate limits and source schema changes.

## Pause and resume a source

1. Use Admin → Data Sources → Pause to disable scheduling.
2. Confirm the source is `PAUSED` and no active BullMQ job is running.
3. Fix credentials, spec, rate limits or data quality issue.
4. Use Resume only when the source remains authorized and onboarding-approved.
5. Trigger a manual run and inspect results before relying on scheduled execution.

## Recover failed jobs

1. Inspect failed jobs in Admin → Data Sources.
2. Fix the root cause: path, credential, endpoint, schema, authorization or rate limit.
3. Trigger a manual run for the source.
4. Confirm the run status, observations created, review backlog and operational alerts.
5. Leave old failed jobs as inspection evidence unless a queue cleanup is explicitly required.

## Handle stale prices

1. Check the source freshness threshold and `lastSuccessfulRunAt`.
2. Confirm whether the upstream source is unavailable or the schedule/worker is stopped.
3. Prices older than freshness thresholds are excluded from current recommendations and alerts.
4. Do not manually mark stale records as current; ingest a new authorized observation.

## Inspect review backlog

1. Use Admin → Review Queue for brochure-derived records.
2. Use Admin → Ingestion Reviews for CSV/JSON/API anomalies and unmatched records.
3. Approve only after correcting permitted fields and selecting a product match when needed.
4. Reject records that cannot be trusted without inventing missing prices.
5. Review events and admin audit logs preserve operator decisions.

## Safely restart the platform

1. Stop API, worker and admin dashboard processes.
2. Keep DynamoDB Local and Redis running unless infrastructure maintenance requires otherwise.
3. Start DynamoDB Local and Redis first.
4. Run migrations, then `pnpm db:verify`.
5. Start API.
6. Start worker and confirm `worker_ready`.
7. Start admin dashboard and inspect Data Sources.
8. Trigger one authorized fixture/manual run before considering the environment healthy.
