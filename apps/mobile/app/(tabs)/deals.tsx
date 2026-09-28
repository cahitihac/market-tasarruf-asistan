import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DealResponse } from '@market/contracts';
import { api } from '../../src/api/client';
import { keys } from '../../src/api/keys';
import { routes } from '../../src/lib/navigation';
import { DataState, Header, Page, SectionTitle } from '../../src/ui/components';
import { DealGroupCard } from '../../src/ui/cards';
import { colors } from '../../src/ui/theme';

type Filter = 'ALL' | 'GREAT' | 'BUY';
const filters: Array<{ value: Filter; label: string }> = [{ value: 'ALL', label: 'Tümü' },
  { value: 'GREAT', label: 'Kaçırılmayacak' }, { value: 'BUY', label: 'Almak için iyi zaman' }];

export default function DealsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('ALL');
  const deals = useQuery({ queryKey: keys.deals(true), queryFn: () => api.deals(true), refetchInterval: 30000 });
  const retry = () => { void deals.refetch(); };
  const visible = (deals.data?.deals ?? []).filter(deal => filter === 'ALL' ||
    (filter === 'GREAT' ? deal.label === 'GREAT_DEAL' : deal.label === 'BUY'));
  const products = new Map<string, Map<string, DealResponse>>();
  for (const deal of visible) {
    const retailers = products.get(deal.canonicalProductId) ?? new Map<string, DealResponse>();
    const key = deal.retailerProductId;
    const current = retailers.get(key);
    if (!current || deal.score > current.score || (deal.score === current.score && deal.currentPriceMinor < current.currentPriceMinor)) retailers.set(key, deal);
    products.set(deal.canonicalProductId, retailers);
  }
  const groups = [...products.values()].map(group => [...group.values()].sort((a, b) => b.score - a.score || a.currentPriceMinor - b.currentPriceMinor));
  return <Page onRefresh={retry} refreshing={deals.isRefetching}>
    <Header eyebrow="SANA ÖZEL" title="Fırsatlar" subtitle="Takip ettiğin ürünlerde öne çıkan güncel market fiyatları." />
    <View style={styles.filters}>{filters.map(item => <Pressable key={item.value} accessibilityRole="button" onPress={() => setFilter(item.value)}
      style={[styles.filter, filter === item.value && styles.selected]}><Text style={[styles.filterText, filter === item.value && styles.selectedText]}>{item.label}</Text></Pressable>)}</View>
    <SectionTitle title="Güncel fırsatlar" hint={deals.data ? `${groups.length} ürün` : undefined} />
    <DataState loading={deals.isPending} error={deals.error} empty={groups.length === 0}
      emptyTitle="Bu filtrede fırsat yok" emptyBody="Yeni fiyatları düzenli olarak kontrol ediyoruz." onRetry={retry}>
      {groups.map(group => <DealGroupCard key={group[0]!.canonicalProductId} deals={group}
        onPress={deal => router.push(routes.deal(deal.id))} />)}
    </DataState>
  </Page>;
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filter: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 }, selected: { backgroundColor: colors.paleGreen, borderColor: colors.green },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, selectedText: { color: colors.darkGreen },
});
