import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { routes } from '../lib/navigation';
import { isNativePushSupported, notificationDealId } from './notifications';

export function PushNotificationRouter() {
  const router = useRouter();
  useEffect(() => {
    if (!isNativePushSupported()) return undefined;
    let mounted = true;
    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (!mounted) return;
      const dealId = notificationDealId(response);
      if (dealId) router.push(routes.deal(dealId));
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const dealId = notificationDealId(response);
      if (dealId) router.push(routes.deal(dealId));
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [router]);
  return null;
}
