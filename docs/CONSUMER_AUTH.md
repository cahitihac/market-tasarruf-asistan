# Consumer Authentication

Phase 12 replaces the mobile app's seeded development identity with real consumer accounts.

## Architecture

Consumer authentication is intentionally separate from admin authentication.

- Consumer endpoints live under `/auth/*`.
- Admin endpoints remain under `/admin/*` and continue to use `AdminUser` and `AdminSession`.
- Consumer users are stored in `User`.
- Consumer sessions are stored in `ConsumerSession`.
- Mobile app routes are gated by `AuthProvider`; unauthenticated users see welcome, login, and register screens.

## Session Model

The consumer API uses opaque bearer session tokens:

- The raw token is returned only at login/register time.
- The database stores only a SHA-256 hash of the token.
- Sessions expire after 30 days.
- Logout revokes the current server-side session and removes the local mobile session.

Passwords use Node `scrypt` with a per-password random salt. Plaintext passwords are never stored or returned.

## API

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

All safe user responses include only `id`, `email`, and `displayName`.

## Authorization

Consumer routes require `Authorization: Bearer <token>`.

Every consumer data query scopes by the authenticated `userId`:

- `/needs`
- `/needs/:id`
- `/needs/:id/offers`
- `/deals`
- `/deals/:id`
- `/alerts`
- `/alerts/:id`
- `/notifications`
- `/notifications/:id/read`

Changing an ID in the URL returns `404` when that record belongs to another consumer.

## Mobile Storage

The mobile app keeps token handling behind `src/auth/session-store.ts`.

- Native Expo uses `expo-secure-store`.
- Expo Web development uses `localStorage` as a development-compatible fallback.

The rest of the mobile app reads auth state from `AuthProvider` and does not access token storage directly.

## Local Test Users

`pnpm db:seed` creates development-only consumer accounts:

- `consumer1@example.test` / `consumer1-demo`
- `consumer2@example.test` / `consumer2-demo`

The seed also creates separate needs for each account so user isolation can be demonstrated.

## Environment Variables

No consumer auth secret is required because tokens are random opaque values and only token hashes are stored.

Mobile still requires:

- `EXPO_PUBLIC_API_URL` for Expo clients.

Backend still requires:

- `DATABASE_URL`
- `REDIS_URL` for worker queues.

## Security Limitations

This is an MVP authentication layer. It includes password hashing, token hashing, server-side session revocation, route authorization, route-level rate limiting on login/register, and safe user serialization.

Not yet implemented:

- password reset
- email verification
- social login
- SMS login
- account deletion
- advanced device/session management UI
- push notification delivery

## Validation

Run the usual project checks:

```sh
pnpm db:migrate
pnpm db:seed
pnpm db:verify
pnpm typecheck
pnpm lint
pnpm test
```

The API auth integration test covers registration, duplicate email rejection, login failures, `/auth/me`, logout invalidation, two-user data isolation, worker ownership preservation, and consumer/admin separation.
