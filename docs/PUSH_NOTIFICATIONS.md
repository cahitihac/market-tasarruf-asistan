# Push Notifications

Phase 14 connects persisted consumer `Notification` records to Expo push delivery. The database notification remains the source of truth; push is an additional delivery channel that can be skipped, retried, or fail without losing the inbox record.

## Architecture

```
Price / Promotion
  -> Worker evaluates UserNeed
  -> Deal
  -> Alert
  -> Notification
  -> push-delivery BullMQ job
  -> Expo Push Service
  -> iOS / Android device
```

Deal evaluation writes `Deal`, `Alert`, and `Notification` records first. After the evaluation job completes, the worker scans notifications without delivery records and enqueues push delivery work on the `push-delivery` queue. A scheduled catch-up job also scans once per minute.

The main evaluation transaction does not call Expo.

## Device Registration

Authenticated mobile clients register Expo push tokens through:

- `POST /push/devices`
- `GET /push/devices`
- `DELETE /push/devices/:id`

The API uses the authenticated consumer identity and current session. Clients never provide `userId`. A token is unique and can belong to only one user at a time; if the same Expo token is registered by another authenticated user, ownership moves to that user and the previous user no longer sees it.

`PushDevice` stores:

- owning user
- current consumer session id
- Expo push token
- platform
- optional device/app labels
- last-seen timestamp
- disabled timestamp
- last delivery timestamp

Logout, session revocation, password-reset session invalidation, password-change session invalidation, and account deletion disable affected devices. Account deletion also skips pending deliveries for the user.

## Preferences

`NotificationPreference` is conservative by default:

- deal alerts disabled
- `GREAT_DEAL` disabled
- `BUY` disabled

The mobile Settings screen enables push only after explanatory Turkish copy and the OS permission flow. Enabling push registers the device and turns on deal, `GREAT_DEAL`, and `BUY` preferences. The Settings screen can toggle `GREAT_DEAL` and `BUY` separately. Disabling push turns off preferences and unregisters active devices for the session user.

Deal push delivery is skipped unless:

- deal alerts are enabled
- the deal label is `GREAT_DEAL` with that preference enabled, or `BUY` with that preference enabled
- the device is active
- the account is active

## Delivery Records

`NotificationDelivery` tracks provider delivery separately from `Notification`:

- notification id
- push device id
- channel, currently `PUSH`
- status: `PENDING`, `SENT`, `FAILED`, `INVALID_TOKEN`, `SKIPPED`
- attempt count
- Expo ticket id as `providerMessageId`
- last error
- sent/failed/delivered timestamps

The database enforces one delivery row per `notificationId + pushDeviceId + channel`. Repeated enqueue attempts therefore cannot create duplicate delivery records, and the BullMQ job id uses the delivery id.

## Expo Provider

Push provider code is behind `PushProvider`:

- `send`
- `sendBatch`
- `checkReceipts`

`ExpoPushProvider` calls the Expo Push Service HTTPS endpoints directly. `MockPushProvider` supports test inspection of attempted messages and can simulate success, temporary provider failure, and invalid tokens.

Set `EXPO_PUSH_ACCESS_TOKEN` if Expo push security is enabled for the project. Without push security, Expo currently accepts server requests without that header.

## Retries And Invalid Tokens

BullMQ retries push jobs with limited exponential backoff. Temporary provider errors are recorded as `FAILED` and re-thrown so BullMQ can retry. Permanent provider errors are recorded without infinite retry.

Expo `DeviceNotRegistered` responses mark the delivery as `INVALID_TOKEN` and disable the `PushDevice`. Disabled devices are not retried unless the app re-registers a fresh token.

## Mobile Behavior

The mobile app uses `expo-notifications` on iOS and Android only. Web keeps the notification inbox and shows that native device push is unsupported.

On notification tap, the app waits for the authenticated stack and navigates using the safe payload:

```json
{ "type": "DEAL", "dealId": "..." }
```

Deal details still load through the authenticated API route, so payload IDs do not bypass ownership checks. If the deal is gone or inaccessible, the existing screen shows the API error state instead of crashing.

For native push testing, configure `EXPO_PUBLIC_EAS_PROJECT_ID` when needed by the build environment and use a development build or supported native app. Modern Expo SDKs do not support Android remote push in Expo Go.

## Local Testing

Local validation expects PostgreSQL and Redis:

```sh
docker compose -f infra/docker-compose.yml up -d
corepack pnpm --filter @market/database db:migrate
corepack pnpm --filter @market/database db:seed
corepack pnpm --filter @market/database db:verify
corepack pnpm --filter @market/api test
corepack pnpm --filter @market/worker test
corepack pnpm --filter @market/mobile typecheck
```

Automated tests use `MockPushProvider` and never call the real Expo Push Service.

## Production Requirements

Before production rollout:

- create native builds with push notification credentials
- configure Expo project id for mobile builds
- decide whether to enable Expo push security and set `EXPO_PUSH_ACCESS_TOKEN`
- monitor push delivery logs by notification id, delivery id, provider, attempt, status, provider ticket id, and failure class
- add receipt polling if production needs confirmed APNs/FCM handoff status
