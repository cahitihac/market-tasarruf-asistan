# Phase 6 mobile app

The Expo Router application lives in `apps/mobile`. It uses TanStack Query for request caching and refresh, and Zod response schemas from `@market/contracts` for the Fastify API. `apps/mobile/src/api/client.ts` is the single place for authenticated HTTP calls. Screens display loading, failure, empty, and retry states.

## Run locally

Start DynamoDB Local and Redis, then the API and worker as described in the root README. In another terminal:

```sh
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @market/mobile start
```

Open the Expo URL in Expo Go, or press `i` for an installed iOS Simulator, `a` for an installed Android Emulator, or `w` for the web preview. The mobile app reads `EXPO_PUBLIC_API_URL` from `apps/mobile/.env`; restart or reload the app after changing it. Native push registration may also read `EXPO_PUBLIC_EAS_PROJECT_ID` when the development build does not expose an EAS project id automatically.

| Device | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Expo Web | `http://127.0.0.1:3001` |
| iOS Simulator | `http://127.0.0.1:3001` |
| Android Emulator | `http://127.0.0.1:3001` (the app maps loopback to `10.0.2.2`) |
| Physical phone on the same Wi-Fi | `http://<your-computer-LAN-IP>:3001` |

For a physical phone, replace the value in `apps/mobile/.env` with the computer's Wi-Fi IPv4 address, set `HOST=0.0.0.0` in the root `.env` before starting the API, and allow port 3001 through the computer firewall. Restart Expo after changing `EXPO_PUBLIC_API_URL`; the value is compiled into the bundle. Confirm the phone can open `http://<your-computer-LAN-IP>:3001/ready` before opening Expo Go. Do not use `localhost`, `127.0.0.1`, or `10.0.2.2` on a physical phone. The browser preview uses CORS; add its origin to `CORS_ORIGINS` in the root `.env` if it is not one of the default local addresses.

## Push Notifications

The notification inbox works on Web and native. Device push uses `expo-notifications` and is only enabled for supported iOS/Android apps. Use a development build or supported native environment for remote push testing; do not treat Expo Web as a native push test.

Settings shows the current push status, a pre-permission explanation, enable/disable actions, and `GREAT_DEAL` / `BUY` deal-alert preferences. Logout disables the current session's registered device on the backend, and signing in again re-registers the current device.

## Screens and data

Home summarizes active needs, unread notifications, and the current best persisted deals. My Needs supports create, edit, and archive; its detail page loads ranked live offers. Deals lists active persisted deal snapshots, including nonqualifying price labels via `/deals?all=true`. Deal Details uses `/deals/:id/history` for the latest 30 observations in a compact price chart. Notifications link to their persisted deal and can be marked read.

The API authenticates consumers with bearer sessions. Expo Web still uses the inbox for notifications; native push requires iOS/Android registration.

## Repeatable local walkthrough

With the API, worker, and Expo web server running, use `pnpm --filter @market/mobile live:verify`. This requires a local Chrome installation. It opens the app in a phone-sized browser, creates a dishwasher-tablet need, checks the 319 TRY Finish offer, triggers the worker, opens its persisted notification and deal, marks the notification read, and checks that `readAt` survives a reload. The script leaves the successful demo need in the development database.
