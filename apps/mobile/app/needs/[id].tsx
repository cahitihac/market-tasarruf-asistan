import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { api, friendlyError } from '../../src/api/client';
import { keys } from '../../src/api/keys';
import { routes } from '../../src/lib/navigation';
import { categoryLabel, constraintSummary } from '../../src/lib/presentation';
import { Button, Card, DataState, Header, Page, SectionTitle, typography } from '../../src/ui/components';
import { OfferGroupCard } from '../../src/ui/cards';
import { colors } from '../../src/ui/theme';

export default function NeedDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const need = useQuery({ queryKey: keys.need(id), queryFn: () => api.need(id) });
  const offers = useQuery({ queryKey: keys.offers(id), queryFn: () => api.offers(id) });
  const archive = useMutation({ mutationFn: () => api.archiveNeed(id), onSuccess: async () => {
    await client.invalidateQueries({ queryKey: keys.needs });
    await client.invalidateQueries({ queryKey: keys.deals(true) });
    router.replace('/needs');
  } });
  const retry = () => { void Promise.all([need.refetch(), offers.refetch()]); };
  const groupedOffers = new Map<string, NonNullable<typeof offers.data>['offers']>();
  for (const offer of offers.data?.offers ?? []) {
    const group = groupedOffers.get(offer.canonicalProduct.id) ?? [];
    group.push(offer); groupedOffers.set(offer.canonicalProduct.id, group);
  }
  return <Page onRefresh={retry} refreshing={need.isRefetching || offers.isRefetching}>
    <Button label="← Takiplerim" onPress={() => router.back()} kind="quiet" />
    <Header eyebrow="TAKİP DETAYI" title={need.data?.name ?? 'Takibin'} subtitle="Tercihlerine uyan market tekliflerini senin için karşılaştırdık." />
    <DataState loading={need.isPending} error={need.error} onRetry={retry}>
      {need.data ? <Card>
        <View style={styles.row}><Text style={typography.h2}>{categoryLabel(need.data.category)}</Text>
          <Text style={styles.active}>{need.data.active ? 'TAKİPTE' : 'ARŞİVLENDİ'}</Text></View>
        <Text style={typography.body}>Öncelikli marka: {need.data.preferredBrands?.join(', ') || 'Marka fark etmez'}</Text>
        {need.data.alternativeBrands?.length ? <Text style={typography.muted}>Alternatifler: {need.data.alternativeBrands.join(', ')}</Text> : null}
        {need.data.excludedBrands?.length ? <Text style={typography.muted}>Gösterilmeyecekler: {need.data.excludedBrands.join(', ')}</Text> : null}
        {constraintSummary(need.data) ? <Text style={typography.muted}>{constraintSummary(need.data)}</Text> : null}
        <View style={styles.actions}><Button label="Düzenle" onPress={() => router.push(routes.form(id))} kind="secondary" />
          <Button label="Takibi Bitir" onPress={() => setConfirmArchive(true)} kind="danger" /></View>
        {confirmArchive ? <View style={styles.confirm}><Text style={typography.body}>Bu ürünün fiyatını takip etmeyi bırakmak istiyor musun?</Text>
          <View style={styles.actions}><Button label="Vazgeç" onPress={() => setConfirmArchive(false)} kind="quiet" />
            <Button label={archive.isPending ? 'Kapatılıyor…' : 'Takibi Bitir'} onPress={() => archive.mutate()} kind="danger" disabled={archive.isPending} /></View></View> : null}
        {archive.error ? <Text style={styles.error}>{friendlyError(archive.error)}</Text> : null}
      </Card> : null}
    </DataState>
    <SectionTitle title="Eşleşen teklifler" hint={offers.data ? `${groupedOffers.size} ürün · ${offers.data.count} market` : undefined} />
    <DataState loading={offers.isPending} error={offers.error} empty={offers.data?.offers.length === 0}
      emptyTitle="Uygun teklif bulamadık" emptyBody="Marka, paket boyutu veya fiyat tercihini biraz esnetmeyi deneyebilirsin." onRetry={retry}>
      {[...groupedOffers.entries()].map(([productId, group]) => <OfferGroupCard key={productId} offers={group} />)}
    </DataState>
    {offers.data?.offers.length ? <Button label="Tüm Fırsatlara Git" onPress={() => router.push('/deals')} kind="secondary" /> : null}
  </Page>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  active: { color: colors.green, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  confirm: { borderTopWidth: 1, borderColor: colors.line, paddingTop: 12, gap: 10 },
  error: { color: colors.red, fontSize: 13 },
});
