import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { SafeUser } from '@market/contracts';

const key = 'market.consumer.session';

export type StoredSession = { token: string; user: SafeUser; expiresAt: string };

function webStorage() {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  const raw = Platform.OS === 'web' ? webStorage()?.getItem(key) ?? null : await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredSession; }
  catch { return null; }
}

export async function saveStoredSession(session: StoredSession) {
  const raw = JSON.stringify(session);
  if (Platform.OS === 'web') webStorage()?.setItem(key, raw);
  else await SecureStore.setItemAsync(key, raw);
}

export async function clearStoredSession() {
  if (Platform.OS === 'web') webStorage()?.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}
