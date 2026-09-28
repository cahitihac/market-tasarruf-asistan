import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../api/client';

export type PushStatus = 'enabled' | 'disabled' | 'denied' | 'unsupported';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function isNativePushSupported() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function projectId() {
  return process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId;
}

export async function currentPushStatus(): Promise<PushStatus> {
  if (!isNativePushSupported()) return 'unsupported';
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted) return 'enabled';
  if (permissions.status === 'denied' || permissions.canAskAgain === false) return 'denied';
  return 'disabled';
}

export async function registerCurrentDeviceForPush() {
  if (!isNativePushSupported()) return { status: 'unsupported' as const };
  const existing = await Notifications.getPermissionsAsync();
  const permissions = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permissions.granted) return { status: permissions.canAskAgain === false ? 'denied' as const : 'disabled' as const };
  const token = (await Notifications.getExpoPushTokenAsync(projectId() ? { projectId: projectId() } : undefined)).data;
  const device = await api.registerPushDevice({
    expoPushToken: token,
    platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    deviceName: Platform.OS === 'ios' ? 'iPhone / iPad' : 'Android cihaz',
    appVersion: Constants.expoConfig?.version,
  });
  await api.updateNotificationPreferences({ dealAlertsEnabled: true, greatDealEnabled: true, buyEnabled: true });
  return { status: 'enabled' as const, device };
}

export function notificationDealId(response: Notifications.NotificationResponse | null | undefined) {
  const data = response?.notification.request.content.data;
  if (data?.type === 'DEAL' && typeof data.dealId === 'string') return data.dealId;
  return null;
}
