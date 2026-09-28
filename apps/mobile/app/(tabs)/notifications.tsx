import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NotificationResponse } from '@market/contracts';
import { api, friendlyError } from '../../src/api/client';
import { keys } from '../../src/api/keys';
import { routes } from '../../src/lib/navigation';
import { dateLabel, money, productLabel, recommendation } from '../../src/lib/presentation';
import { Card, DataState, Header, Page, SectionTitle, typography } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';

function NotificationCard({ notification }: { notification: NotificationResponse }) {
  const router = useRouter();
  const client = useQueryClient();
  const markRead = useMutation({ mutationFn: () => api.readNotification(notification.id),
    onSuccess: () => { void client.invalidateQueries({ queryKey: keys.notifications }); } });
  const deal = notification.alert.deal;
  return <Card style={!notification.readAt ? styles.unread : undefined}>
    <Pressable accessibilityRole="button" testID={`notification-${notification.id}`}
      onPress={() => router.push(routes.deal(notification.alert.dealId))} style={styles.content}>
      <View style={styles.row}><Text style={styles.state}>{notification.readAt ? 'OKUNDU' : '●  YENİ'}</Text>
        <Text style={typography.caption}>{dateLabel(notification.createdAt)}</Text></View>
      <Text style={typography.h2}>{productLabel(deal.productName)} için {recommendation(deal.label).text.toLocaleLowerCase('tr-TR')}</Text>
      <Text style={typography.muted}>{deal.retailerName} fiyatı {money(deal.currentPriceMinor)} oldu. Fırsatın ayrıntılarına göz at.</Text>
      <Text style={styles.link}>Fırsatı İncele  →</Text>
    </Pressable>
    {!notification.readAt ? <Pressable accessibilityRole="button" testID={`read-${notification.id}`}
      onPress={() => markRead.mutate()} disabled={markRead.isPending} style={styles.readButton}>
      <Text style={styles.readText}>{markRead.isPending ? 'Kaydediliyor…' : 'Okundu Olarak İşaretle'}</Text></Pressable> : null}
    {markRead.error ? <Text style={styles.error}>{friendlyError(markRead.error)}</Text> : null}
  </Card>;
}

export default function NotificationsScreen() {
  const notifications = useQuery({ queryKey: keys.notifications, queryFn: api.notifications, refetchInterval: 30000 });
  const retry = () => { void notifications.refetch(); };
  const unread = notifications.data?.notifications.filter(item => !item.readAt).length ?? 0;
  return <Page onRefresh={retry} refreshing={notifications.isRefetching}>
    <Header eyebrow="FİYAT TAKİBİ" title="Bildirimler" subtitle="Takip ettiğin ürünlerde dikkate değer bir fiyat olduğunda burada göreceksin." />
    <SectionTitle title="Fiyat haberlerin" hint={`${unread} okunmamış`} />
    <DataState loading={notifications.isPending} error={notifications.error} empty={notifications.data?.notifications.length === 0}
      emptyTitle="Henüz bildirimin yok" emptyBody="Takiplerinden iyi bir fırsat çıktığında sana burada haber vereceğiz." onRetry={retry}>
      {notifications.data?.notifications.map(item => <NotificationCard key={item.id} notification={item} />)}
    </DataState>
  </Page>;
}

const styles = StyleSheet.create({
  unread: { borderColor: colors.green, borderWidth: 1.5 },
  content: { gap: 8 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  state: { color: colors.green, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  link: { color: colors.green, fontSize: 13, fontWeight: '700' },
  readButton: { alignSelf: 'flex-start', borderRadius: 10, backgroundColor: colors.paleGreen,
    paddingHorizontal: 12, paddingVertical: 9 },
  readText: { color: colors.darkGreen, fontSize: 12, fontWeight: '800' },
  error: { color: colors.red, fontSize: 12 },
});
