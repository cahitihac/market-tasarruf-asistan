import { Platform } from 'react-native';

// Android Emulator routes the host machine through 10.0.2.2. A real phone must
// use the computer's LAN address in EXPO_PUBLIC_API_URL instead of loopback.
export function resolveApiUrl(configuredUrl: string, platform: string): string {
  const trimmed = configuredUrl.trim().replace(/\/+$/, '');
  if (platform !== 'android') return trimmed;
  return trimmed.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/i, (_, scheme: string) => `${scheme}10.0.2.2`);
}

export const apiUrl = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL ?? '', Platform.OS);
export const developmentSession = { mode: 'seeded-demo-user', email: 'demo@market.local' } as const;
