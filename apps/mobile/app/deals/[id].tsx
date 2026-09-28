import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { PriceHistoryResponse } from '@market/contracts';
import { api } from '../../src/api/client';
import { keys } from '../../src/api/keys';
import { categoryLabel, dateLabel, money, productLabel, reasonText, savingsText, unitLabel } from '../../src/lib/presentation';
import { Button, Card, DataState, DealBadge, Header, Page, SectionTitle, typography } from '../../src/ui/components';
import { ProductVisual, RetailerMark } from '../../src/ui/cards';
import { colors } from '../../src/ui/theme';

function Stat({ label, value }: { label: string; value: number | null }) {
  return <View style={styles.stat}><Text style={typography.caption}>{label.toUpperCase()}</Text>
    <Text style={styles.statValue}>{value == null ? '—' : money(Math.round(value))}</Text></View>;
}

function PriceChart({ history }: { history: PriceHistoryResponse }) {
  const points = history.points.slice(-30);
  if (!points.length) return <Text style={typography.muted}>Henüz yeterli fiyat geçmişi yok.</Text>;
  const prices = points.map(point => point.priceMinor);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(max - min, 1);
  return <View style={styles.chartBlock} accessibilityLabel={`${points.length} gözlem içeren fiyat geçmişi grafiği`}>
    <View style={styles.chart}>{points.map((point, index) => <View key={`${point.observedAt}-${index}`} style={styles.barSlot}>
      <View style={[styles.bar, { height: 18 + (point.priceMinor - min) / span * 86,
        backgroundColor: index === points.length - 1 ? colors.gold : colors.green }]} /></View>)}</View>
    <View style={styles.chartLabels}><Text style={typography.caption}>{dateLabel(points[0]!.observedAt)}</Text>
      <Text style={typography.caption}>Son fiyat {money(points[points.length - 1]!.priceMinor)}</Text></View>
  </View>;
}

export default function DealDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const deal = useQuery({ queryKey: keys.deal(id), queryFn: () => api.deal(id) });
  const history = useQuery({ queryKey: keys.history(id), queryFn: () => api.history(id) });
  const retry = () => { void Promise.all([deal.refetch(), history.refetch()]); };
  return <Page onRefresh={retry} refreshing={deal.isRefetching || history.isRefetching}>
    <Button label="← Geri" onPress={() => router.back()} kind="quiet" />
    <Header eyebrow="FIRSAT DETAYI" title={deal.data ? productLabel(deal.data.productName) : 'Fırsat'} subtitle="Fiyat geçmişine göre bu teklifin neden öne çıktığını gör." />
    <DataState loading={deal.isPending} error={deal.error} onRetry={retry}>
      {deal.data ? <>
        <Card style={styles.hero}><View style={styles.visualRow}><ProductVisual name={deal.data.productName} />
          <View style={styles.grow}><Text style={typography.muted}>{deal.data.canonicalProduct?.brand?.name ?? 'Marka belirtilmemiş'}</Text>
            <Text style={typography.muted}>{categoryLabel(deal.data.canonicalProduct?.category.name ?? null)}</Text></View></View>
          <DealBadge label={deal.data.label} />
          <Text style={styles.price}>{money(deal.data.currentPriceMinor)}</Text>
          {savingsText(deal.data.priceStatistics.differenceFrom90dPercent) ? <Text style={styles.saving}>
            ↓  {savingsText(deal.data.priceStatistics.differenceFrom90dPercent)}</Text> : null}
          <View style={styles.storeRow}><RetailerMark name={deal.data.retailerName} /><Text style={styles.store}>
            {deal.data.retailerName}{deal.data.branchName ? ` · ${deal.data.branchName}` : ''}</Text></View>
          <Text style={typography.muted}>Birim fiyatı {money(deal.data.unitPriceMinor)} / {unitLabel(deal.data.unitBasis)}</Text>
        </Card>
        <SectionTitle title="Neden öne çıkıyor?" />
        <Card>{deal.data.reasons.map((reason, index) => <Text key={`${reason}-${index}`} style={typography.body}>✓  {reasonText(reason)}</Text>)}
          {deal.data.matchReasons.map((reason, index) => <Text key={`${reason}-${index}`} style={typography.muted}>·  {reasonText(reason)}</Text>)}</Card>
        <SectionTitle title="Fiyat karşılaştırması" hint="Paket fiyatı" />
        <Card><View style={styles.grid}>
          <Stat label="7 günlük ortalama" value={deal.data.priceStatistics.average7d} />
          <Stat label="30 günlük ortalama" value={deal.data.priceStatistics.average30d} />
          <Stat label="90 günlük ortalama" value={deal.data.priceStatistics.average90d} />
          <Stat label="Görülen en düşük" value={deal.data.priceStatistics.historicalMin} />
          <Stat label="Görülen en yüksek" value={deal.data.priceStatistics.historicalMax} />
        </View></Card>
        <SectionTitle title="Fiyat geçmişi" hint="Son 30 fiyat" />
        <Card><DataState loading={history.isPending} error={history.error} empty={history.data?.points.length === 0}
          emptyTitle="Fiyat geçmişi yok" emptyBody="Yeni fiyatlar geldikçe grafik burada oluşacak." onRetry={() => { void history.refetch(); }}>
          {history.data ? <PriceChart history={history.data} /> : null}
        </DataState></Card>
        <Text style={typography.caption}>Son fiyat tarihi: {dateLabel(deal.data.observedAt)}</Text>
      </> : null}
    </DataState>
  </Page>;
}

const styles = StyleSheet.create({
  hero: { gap: 12 }, visualRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, grow: { flex: 1 },
  price: { color: colors.ink, fontSize: 42, fontWeight: '900', letterSpacing: -1 }, saving: { color: colors.green, fontSize: 15, fontWeight: '800' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  store: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '47%', backgroundColor: colors.background, borderRadius: 12, padding: 12, gap: 5 },
  statValue: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  chartBlock: { gap: 10 }, chart: { height: 130, flexDirection: 'row', alignItems: 'flex-end', gap: 2,
    borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 4 },
  barSlot: { flex: 1, justifyContent: 'flex-end' }, bar: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between' },
});
