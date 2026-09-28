import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import { keys } from '../../src/api/keys';
import { routes } from '../../src/lib/navigation';
import { productLabel } from '../../src/lib/presentation';
import { Button, Card, DataState, Header, Page, SectionTitle, typography } from '../../src/ui/components';
import { DealCard } from '../../src/ui/cards';
import { colors } from '../../src/ui/theme';

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Günaydın.' : hour < 18 ? 'İyi günler.' : 'İyi akşamlar.';
}

export default function HomeScreen() {
  const router = useRouter();
  const needs = useQuery({ queryKey: keys.needs, queryFn: api.needs });
  const deals = useQuery({ queryKey: keys.deals(false), queryFn: () => api.deals(false), refetchInterval: 30000 });
  const notifications = useQuery({ queryKey: keys.notifications, queryFn: api.notifications, refetchInterval: 30000 });
  const retry = () => { void Promise.all([needs.refetch(), deals.refetch(), notifications.refetch()]); };
  const opportunities = deals.data?.deals ?? [];
  const seen = new Set<string>();
  const uniqueDeals = opportunities.filter(deal => {
    const key = `${deal.canonicalProductId}:${deal.retailerProductId}`;
    if (seen.has(key)) return false; seen.add(key); return true;
  });
  const best = uniqueDeals[0];
  const unread = notifications.data?.notifications.filter(item => !item.readAt).length ?? 0;
  return <Page onRefresh={retry} refreshing={needs.isRefetching || deals.isRefetching || notifications.isRefetching}>
    <Header eyebrow="MARKET ASİSTANIN" title={greeting()} subtitle="Alışveriş listen için fiyatları takip ediyor, doğru zamanı sana söylüyoruz." />
    <DataState loading={needs.isPending || deals.isPending || notifications.isPending}
      error={needs.error || deals.error || notifications.error} onRetry={retry}>
      <Card style={styles.hero}>
        <Text style={styles.heroEyebrow}>BUGÜN SENİN İÇİN</Text>
        <Text style={styles.heroTitle}>{uniqueDeals.length ? `${uniqueDeals.length} fırsat bulduk.` : 'Takibe başlamak çok kolay.'}</Text>
        <Text style={styles.heroBody}>{best ? `${productLabel(best.productName)} için dikkat çeken bir fiyat var.` : 'Almak istediğin ürünü ekle, fiyatları senin yerine takip edelim.'}</Text>
        <View style={styles.heroButton}><Button label={best ? 'Fırsatları Gör' : 'İlk Takibini Oluştur'}
          onPress={() => router.push(best ? '/deals' : '/need-form')} kind="secondary" /></View>
      </Card>
      <View style={styles.stats}>
        <Card style={styles.statCard}><Text style={styles.statValue}>{needs.data?.needs.length ?? 0}</Text><Text style={styles.statLabel}>Aktif takip</Text></Card>
        <Card style={styles.statCard}><Text style={styles.statValue}>{unread}</Text><Text style={styles.statLabel}>Okunmamış bildirim</Text></Card>
      </View>
      <SectionTitle title="Bugünün en iyi fırsatı" hint="Fiyat geçmişine göre" />
      {best ? <DealCard deal={best} onPress={() => router.push(routes.deal(best.id))} />
        : <Card><Text style={typography.h2}>Henüz bir fırsat yok</Text><Text style={typography.muted}>Takip ettiğin ürünlerde iyi bir fiyat bulduğumuzda burada göstereceğiz.</Text>
          <Button label="Takiplerime Git" onPress={() => router.push('/needs')} kind="secondary" /></Card>}
      {uniqueDeals.length > 1 ? <Button label={`Diğer ${uniqueDeals.length - 1} fırsatı gör`} onPress={() => router.push('/deals')} kind="secondary" /> : null}
    </DataState>
  </Page>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.darkGreen, borderColor: colors.darkGreen, padding: 24 },
  heroEyebrow: { color: '#A9DDC3', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', maxWidth: 330, lineHeight: 34, letterSpacing: -0.5 },
  heroBody: { color: '#D6EBE0', fontSize: 15, lineHeight: 22 }, heroButton: { alignSelf: 'flex-start', marginTop: 8 },
  stats: { flexDirection: 'row', gap: 12 }, statCard: { flex: 1, padding: 16 },
  statValue: { color: colors.ink, fontSize: 25, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
});
