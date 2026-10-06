# DynamoDB persistence migration

## Status

The runtime data layer stores application records in DynamoDB. `@market/database` owns the application model metadata and implements CRUD, relation filters/includes, compound uniqueness, ordering, and update operators. Tests use the same behavior through an in-memory store; local development uses DynamoDB Local.

The relational ORM client, schema, migration history, generator configuration, and dependencies have been removed. Seed and verification scripts now live under `packages/database/scripts`.

## Target item contract

The table provides `PK`, `SK`, `GSI1PK`, and `GSI1SK` string keys plus optional `expiresAtEpoch` TTL. Records use `MODEL#<model>` partitions and `ID#<id>` sort keys; the GSI supplies entity/time ordering. Items include `entityType` and `schemaVersion` metadata.

Initial access patterns to design explicitly include:

- users by ID and normalized email;
- consumer/admin sessions and account tokens by token hash and expiry;
- needs, locations, preferences, devices, deals, recommendations, alerts, and notifications by user;
- delivery records by notification/device and pending status;
- products and variants by canonical ID, normalized identity, category, and brand;
- retailer products and price observations by retailer identity, product, source, and observation time;
- ingestion/extraction runs, review queues, audit logs, and operational alerts by status and time;
- data sources by slug, enabled/authorization state, and scheduled-run eligibility.

## Transaction and uniqueness guarantees

Callback transactions stage writes in an isolated overlay and commit them with one DynamoDB `TransactWriteItems` request. A failed callback commits nothing, and transactions that exceed DynamoDB's 100-operation limit fail before sending. Array-style transaction calls are rejected because their promises may have started outside the transaction boundary.

Single-field and compound unique constraints use ownership-marker items in the same transaction as the record. Conditional marker writes prevent concurrent Lambda invocations from claiming the same email, token, slug, or compound key.

## Scaling notes

The current access layer queries one model partition and evaluates complex relationship predicates in application code. Before traffic makes any partition hot, introduce access-pattern-specific index items for the measured high-volume paths (price history, pending deliveries, ingestion/review queues). This is a capacity optimization rather than a data-correctness gap. A one-time relational export/import is only needed if an environment with existing legacy data must be retained.
