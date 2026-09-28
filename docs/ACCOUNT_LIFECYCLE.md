# Account Lifecycle And Security

Phase 13 completes the consumer account lifecycle before push notification delivery. It does not add social login, SMS login, or push delivery.

## Email Verification

Newly registered consumers start with `emailVerifiedAt = null`. Registration creates a single-use `EMAIL_VERIFICATION` token, stores only its SHA-256 hash in `ConsumerAccountToken`, and sends a development verification link through the email provider abstraction.

Verification uses `POST /auth/verify-email` with the raw token. A valid token must be unused, unexpired, and belong to an active non-deleted user. Successful verification sets `User.emailVerifiedAt` and marks the token used. Reusing the same link returns an invalid/expired token error.

Verification tokens expire after 24 hours. `POST /auth/resend-verification` invalidates previous unused verification tokens for the user before issuing a new one.

## Password Reset

`POST /auth/forgot-password` always returns a generic success response so callers cannot discover whether an email exists. If the email belongs to an active non-deleted user, the API creates a single-use `PASSWORD_RESET` token and sends a development reset link.

Reset tokens are SHA-256 hashed at rest and expire after 15 minutes. `POST /auth/reset-password` validates the token, updates the password with the existing scrypt password hashing strategy, marks reset tokens used, and revokes all active consumer sessions for that user. After reset, old passwords and old sessions no longer work.

## Change Password

Authenticated users can call `POST /auth/change-password` with their current password and a new password. The current password is required and verified with the same scrypt strategy as login.

On success, the current session remains active and all other active sessions are revoked. This keeps the user in their current app session while removing stale or potentially exposed sessions.

## Session Model

Consumer sessions still use opaque bearer tokens. The raw token is returned only at login/register time; the database stores `ConsumerSession.tokenHash`.

Sessions now also store:

- `createdAt`
- `lastUsedAt`
- `expiresAt`
- `revokedAt`
- `clientLabel`
- `ipAddress`

`GET /auth/sessions` returns only the authenticated user's own sessions and never exposes raw tokens. `DELETE /auth/sessions/:id` can revoke only a session owned by the authenticated user. `POST /auth/logout-all` supports `includeCurrent: false` for "logout other sessions" and `includeCurrent: true` for "logout all sessions".

## Account Deletion

`DELETE /account` is destructive and requires both the current password and exact confirmation text:

```text
DELETE MY ACCOUNT
```

Deletion uses a soft-delete/anonymization strategy:

- `User.status` becomes `DISABLED`.
- `User.deletedAt` is set.
- `User.email` is replaced with `deleted-{userId}@deleted.local`.
- `User.displayName`, `User.passwordHash`, and `User.emailVerifiedAt` are cleared.
- All active consumer sessions are revoked.
- All unused lifecycle tokens are invalidated.

The operation does not delete shared/catalog data. User-owned operational records are retained for referential integrity and historical analysis:

- `UserNeeds` remain attached to the disabled user record.
- `Deals` remain attached to the disabled user record.
- `Alerts` remain attached to the disabled user record.
- `Notifications` remain attached to the disabled user record.
- Historical operational records, ingestion provenance, price observations, brochure review data, and admin audit/provenance records are not silently deleted.

Deleted users cannot login because their account is disabled, password hash is cleared, sessions are revoked, and the original email is no longer present on the user record.

## Development Email Provider

Email delivery is behind an `EmailProvider` interface:

- `sendVerificationEmail(...)`
- `sendPasswordResetEmail(...)`

The local `DevelopmentEmailProvider` stores a small in-memory outbox. For local testing, use `GET /auth/dev-email-links` to read recent verification/reset links. This endpoint is unavailable in production.

The development provider avoids logging passwords, auth tokens, or reset/verification token hashes. The raw verification/reset token appears only inside the local development URL so the flow can be tested without a real email provider.

## Future Production Email Provider

A production provider can implement the same interface for services such as Resend, Postmark, SendGrid, or SES. Production setup should add provider credentials through environment variables, set a public app base URL for links, and disable the development outbox endpoint.
