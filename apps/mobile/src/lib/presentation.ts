import type { RecommendationLabel } from '@market/contracts';

export function money(minor: number) {
  const amount = minor / 100;
  return `₺${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2 }).format(amount)}`;
}

export function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Tarih bilinmiyor' : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function recommendation(label: RecommendationLabel) {
  switch (label) {
    case 'GREAT_DEAL': return { text: 'KAÇIRILMAYACAK FIRSAT', icon: '★', tone: 'great' as const };
    case 'BUY': return { text: 'ALMAK İÇİN İYİ ZAMAN', icon: '✓', tone: 'buy' as const };
    case 'GOOD_PRICE': return { text: 'İYİ FİYAT', icon: '↑', tone: 'good' as const };
    case 'NORMAL_PRICE': return { text: 'NORMAL FİYAT', icon: '—', tone: 'normal' as const };
    case 'BAD_PRICE': return { text: 'FİYAT YÜKSEK', icon: '!', tone: 'bad' as const };
  }
}

const categories: Record<string, string> = {
  'dishwasher-tablets': 'Bulaşık makinesi tableti', 'olive-oil': 'Zeytinyağı', coffee: 'Kahve', eggs: 'Yumurta',
  'laundry-detergent': 'Çamaşır deterjanı', 'toilet-paper': 'Tuvalet kağıdı', milk: 'Süt', chicken: 'Tavuk', rice: 'Pirinç', pasta: 'Makarna',
};
Object.assign(categories, { 'Dishwasher tablets': 'Bulaşık makinesi tableti', 'Olive oil': 'Zeytinyağı',
  Coffee: 'Kahve', Eggs: 'Yumurta' });
export function categoryLabel(value: string | null) { return value ? categories[value] ?? value : 'Tüm kategoriler'; }
export function productLabel(value: string) { return value.replace(/\btablets\b/gi, 'tablet').replace(/\bcount\b/gi, 'adet')
  .replace(/Extra Virgin Olive Oil/gi, 'Natürel Sızma Zeytinyağı').replace(/Turkish Coffee/gi, 'Türk Kahvesi'); }
export function unitLabel(unit: string) { return unit === 'piece' ? 'adet' : unit === 'L' ? 'litre' : unit === 'kg' ? 'kg' : unit; }

export function constraintSummary(need: { minimumCount?: number; minimumVolumeMl?: number;
  maximumUnitPriceMinor?: number; allowAlternatives?: boolean }) {
  const items = [need.minimumCount ? `En az ${need.minimumCount} adet` : null,
    need.minimumVolumeMl ? `En az ${need.minimumVolumeMl >= 1000 ? `${need.minimumVolumeMl / 1000} litre` : `${need.minimumVolumeMl} ml`}` : null,
    need.maximumUnitPriceMinor ? `Birim başına en fazla ${money(need.maximumUnitPriceMinor)}` : null,
    need.allowAlternatives ? 'Alternatif markalar olabilir' : null];
  return items.filter(Boolean).join(' · ');
}

export function savingsText(difference: number | null) {
  if (difference == null) return null;
  const rounded = Math.round(Math.abs(difference));
  return difference >= 0 ? `90 günlük ortalamadan %${rounded} daha ucuz` : `90 günlük ortalamadan %${rounded} daha pahalı`;
}

export function reasonText(reason: string) {
  const below = reason.match(/^(\d+)% below 90-day average$/);
  if (below) return `90 günlük ortalamadan %${below[1]} daha ucuz`;
  const above = reason.match(/^(\d+)% above 90-day average$/);
  if (above) return `90 günlük ortalamadan %${above[1]} daha pahalı`;
  const min = reason.match(/^(\d+)% above historical minimum$/);
  if (min) return `Görülen en düşük fiyatın yalnızca %${min[1]} üzerinde`;
  const promo = reason.match(/^(\d+)% promotion discount$/);
  if (promo) return `%${promo[1]} kampanya indirimi`;
  const unitAdvantage = reason.match(/^(\d+)% unit price advantage$/);
  if (unitAdvantage) return `Birim fiyatı diğer tekliflerden %${unitAdvantage[1]} daha avantajlı`;
  const translations: Record<string, string> = {
    'Preferred brand': 'Tercih ettiğin marka', 'Exact category match': 'Aradığın ürün grubuyla eşleşiyor',
    'Category inferred from need name': 'Aradığın ürünle eşleşiyor', 'Product name match': 'Ürün adıyla eşleşiyor',
    'Alternative brand': 'Kabul ettiğin alternatif marka', 'Other acceptable brand': 'Uygun alternatif marka',
    'Package size meets minimum': 'Paket boyutu isteğine uygun', 'Unit price within limit': 'Birim fiyat bütçene uygun',
    'At historical minimum': 'Gördüğümüz en düşük fiyat',
    'Exceptional historical low': 'Güçlü fiyat geçmişiyle gördüğümüz en düşük fiyat',
    'Insufficient price history for a strong recommendation': 'Güçlü bir öneri için henüz yeterli fiyat geçmişi yok',
  };
  return translations[reason] ?? reason;
}
