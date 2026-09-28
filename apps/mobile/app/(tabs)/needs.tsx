import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { NeedResponse } from '@market/contracts';
import { api } from '../../src/api/client';
import { keys } from '../../src/api/keys';
import { categoryLabel, constraintSummary } from '../../src/lib/presentation';
import { routes } from '../../src/lib/navigation';
import { Button, Card, DataState, Header, Page, typography } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';

function NeedRow({ need }: { need: NeedResponse }) {
  const router = useRouter();
  const offers = useQuery({ queryKey: keys.offers(need.id), queryFn: () => api.offers(need.id) });
  return <Card onPress={() => router.push(routes.need(need.id))}>
    <View style={styles.row}><View style={styles.grow}><Text style={typography.h2}>{need.name}</Text>
      <Text style={typography.muted}>{categoryLabel(need.category)}</Text></View><Text style={styles.arrow}>→</Text></View>
    {need.preferredBrands?.length ? <Text style={styles.brand}>Öncelikli marka: {need.preferredBrands.join(', ')}</Text> : null}
    {constraintSummary(need) ? <Text style={typography.muted}>{constraintSummary(need)}</Text> : null}
    <Text style={styles.offerCount}>{offers.isPending ? 'Fırsatlar kontrol ediliyor…' : offers.isError ? 'Şu anda kontrol edilemiyor' : `${offers.data.count} güncel teklif`}</Text>
  </Card>;
}

export default function NeedsScreen() {
  const router = useRouter();
  const needs = useQuery({ queryKey: keys.needs, queryFn: api.needs });
  const retry = () => { void needs.refetch(); };
  return <Page onRefresh={retry} refreshing={needs.isRefetching}>
    <Header eyebrow="ALIŞVERİŞ LİSTEN" title="Takiplerim" subtitle="Almak istediğin ürünleri ekle, uygun fiyatı yakaladığımızda sana haber verelim."
      action={<Button label="+ Ekle" onPress={() => router.push('/need-form')} />} />
    <DataState loading={needs.isPending} error={needs.error} empty={needs.data?.needs.length === 0}
      emptyTitle="Henüz bir takibin yok" emptyBody="İlk ürününü ekle, market fiyatlarını senin için karşılaştıralım." onRetry={retry}>
      {needs.data?.needs.map(need => <NeedRow key={need.id} need={need} />)}
    </DataState>
    {needs.data?.needs.length === 0 ? <Button label="İlk Takibini Oluştur" onPress={() => router.push('/need-form')} /> : null}
  </Page>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grow: { flex: 1 }, arrow: { color: colors.green, fontSize: 24, fontWeight: '600' },
  brand: { color: colors.darkGreen, fontSize: 13, fontWeight: '700' },
  offerCount: { color: colors.green, fontSize: 13, fontWeight: '700' },
});
