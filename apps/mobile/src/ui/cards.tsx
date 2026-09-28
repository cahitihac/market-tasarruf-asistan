import { StyleSheet, Text, View } from 'react-native';
import type { DealResponse, OfferResponse } from '@market/contracts';
import { money, productLabel, reasonText, savingsText, unitLabel } from '../lib/presentation';
import { Button, Card, DealBadge, typography } from './components';
import { colors } from './theme';

export interface VisualIdentity { imageUrl?: string | null; logoUrl?: string | null }

export function ProductVisual({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  // imageUrl is reserved for the future catalog image contract. The placeholder is deterministic today.
  return <View style={styles.productVisual} accessibilityLabel={`${name} ürün görseli`}>
    <Text style={styles.productEmoji}>{imageUrl ? '▧' : '◇'}</Text>
  </View>;
}

export function RetailerMark({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return <View style={styles.retailerMark} accessibilityLabel={`${name} logosu`}>
    <Text style={styles.retailerInitial}>{logoUrl ? '▧' : name.slice(0, 1).toLocaleUpperCase('tr-TR')}</Text>
  </View>;
}

export function DealCard({ deal, onPress, compact = false }: { deal: DealResponse; onPress: () => void; compact?: boolean }) {
  const comparison = savingsText(deal.priceStatistics.differenceFrom90dPercent);
  return <Card onPress={onPress}>
    <View style={styles.top}><ProductVisual name={deal.productName} /><View style={styles.grow}>
      <Text style={typography.h2} numberOfLines={2}>{productLabel(deal.productName)}</Text>
      <View style={styles.retailerLine}><RetailerMark name={deal.retailerName} /><Text style={typography.muted} numberOfLines={1}>
        {deal.retailerName}{deal.branchName ? ` · ${deal.branchName}` : ''}</Text></View>
    </View></View>
    <DealBadge label={deal.label} />
    <Text style={styles.price}>{money(deal.currentPriceMinor)}</Text>
    {comparison ? <Text style={styles.saving}>↓  {comparison}</Text> : null}
    <Text style={typography.muted}>Birim fiyatı {money(deal.unitPriceMinor)} / {unitLabel(deal.unitBasis)}</Text>
    {deal.reasons[0] ? <Text style={typography.muted}>{reasonText(deal.reasons[0])}</Text> : null}
    {!compact ? <Text style={styles.link}>Fırsatı İncele  →</Text> : null}
  </Card>;
}

function RetailerOffer({ offer }: { offer: OfferResponse }) {
  const comparison = savingsText(offer.priceStatistics.differenceFrom90dPercent);
  return <View style={styles.offerRow}>
    <RetailerMark name={offer.retailer.name} />
    <View style={styles.offerInfo}><Text style={styles.retailerName}>{offer.retailer.name}</Text>
      {offer.retailer.branch ? <Text style={styles.branch} numberOfLines={1}>{offer.retailer.branch.name}</Text> : null}
      {comparison ? <Text style={styles.savingSmall}>{comparison}</Text> : null}</View>
    <View style={styles.offerPrice}><Text style={styles.offerAmount}>{money(offer.currentPrice.amountMinor)}</Text>
      <Text style={styles.unitPrice}>{money(offer.unitPrice.amountMinor)} / {unitLabel(offer.unitPrice.basis)}</Text>
      <DealBadge label={offer.recommendation} /></View>
  </View>;
}

export function OfferGroupCard({ offers }: { offers: OfferResponse[] }) {
  const first = offers[0];
  if (!first) return null;
  return <Card>
    <View style={styles.top}><ProductVisual name={first.canonicalProduct.name} /><View style={styles.grow}>
      <Text style={typography.h2}>{productLabel(first.canonicalProduct.name)}</Text>
      <Text style={typography.muted}>{first.canonicalProduct.brand ?? 'Marka belirtilmemiş'} · {offers.length} mağaza teklifi</Text>
    </View></View>
    <View style={styles.offerList}>{offers.map(offer => <RetailerOffer key={`${offer.retailerProduct.id}:${offer.retailer.branch?.id ?? 'online'}`} offer={offer} />)}</View>
  </Card>;
}

export function DealGroupCard({ deals, onPress }: { deals: DealResponse[]; onPress: (deal: DealResponse) => void }) {
  const first = deals[0];
  if (!first) return null;
  return <Card><View style={styles.top}><ProductVisual name={first.productName} /><View style={styles.grow}>
    <Text style={typography.h2}>{productLabel(first.productName)}</Text><Text style={typography.muted}>{deals.length} markette güncel fiyat</Text></View></View>
    <View style={styles.offerList}>{deals.map(deal => <Card key={deal.id} onPress={() => onPress(deal)} style={styles.dealRow}>
      <View style={styles.dealRetailer}><RetailerMark name={deal.retailerName} /><View style={styles.grow}>
        <Text style={styles.retailerName}>{deal.retailerName}</Text>
        <Text style={styles.savingSmall}>{savingsText(deal.priceStatistics.differenceFrom90dPercent) ?? 'Güncel fiyat'}</Text></View></View>
      <View style={styles.offerPrice}><Text style={styles.offerAmount}>{money(deal.currentPriceMinor)}</Text><DealBadge label={deal.label} /></View>
    </Card>)}</View></Card>;
}

export function EmptyAction({ label, onPress }: { label: string; onPress: () => void }) { return <Button label={label} onPress={onPress} />; }

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, grow: { flex: 1, gap: 5 },
  productVisual: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.paleGreen,
    alignItems: 'center', justifyContent: 'center' }, productEmoji: { color: colors.green, fontSize: 25, fontWeight: '700' },
  retailerLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  retailerMark: { width: 25, height: 25, borderRadius: 8, backgroundColor: colors.background,
    borderColor: colors.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  retailerInitial: { color: colors.darkGreen, fontSize: 11, fontWeight: '800' },
  price: { color: colors.ink, fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -1 },
  saving: { color: colors.green, fontSize: 14, fontWeight: '800' },
  link: { color: colors.green, fontSize: 14, fontWeight: '800', marginTop: 2 },
  offerList: { borderTopWidth: 1, borderTopColor: colors.line },
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.line },
  offerInfo: { flex: 1, gap: 2 }, retailerName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  branch: { color: colors.muted, fontSize: 11 }, savingSmall: { color: colors.green, fontSize: 11, fontWeight: '700' },
  offerPrice: { alignItems: 'flex-end', gap: 5, maxWidth: '48%' },
  offerAmount: { color: colors.ink, fontSize: 21, fontWeight: '900' },
  unitPrice: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  dealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12,
    borderRadius: 14, backgroundColor: colors.background }, dealRetailer: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
});
