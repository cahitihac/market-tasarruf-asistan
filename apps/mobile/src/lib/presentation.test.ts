import { describe, expect, it } from 'vitest';
import { routes } from './navigation';
import { categoryLabel, constraintSummary, money, reasonText, recommendation, savingsText } from './presentation';

describe('mobile presentation and navigation', () => {
  it('formats Turkish lira prices and need constraints', () => {
    expect(money(31900)).toBe('₺319');
    expect(money(443)).toBe('₺4,43');
    expect(categoryLabel('dishwasher-tablets')).toBe('Bulaşık makinesi tableti');
    expect(constraintSummary({ minimumCount: 40, allowAlternatives: true })).toContain('En az 40 adet');
    expect(savingsText(22.4)).toBe('90 günlük ortalamadan %22 daha ucuz');
  });
  it('gives each recommendation a textual label', () => {
    expect(recommendation('GREAT_DEAL').text).toBe('KAÇIRILMAYACAK FIRSAT');
    expect(recommendation('BUY').text).toBe('ALMAK İÇİN İYİ ZAMAN');
    expect(recommendation('GOOD_PRICE').text).toBe('İYİ FİYAT');
    expect(recommendation('NORMAL_PRICE').text).toBe('NORMAL FİYAT');
    expect(recommendation('BAD_PRICE').text).toBe('FİYAT YÜKSEK');
  });

  it('localizes DealScore explanations without exposing the numeric score', () => {
    expect(reasonText('At historical minimum')).toBe('Gördüğümüz en düşük fiyat');
    expect(reasonText('Exceptional historical low')).toBe('Güçlü fiyat geçmişiyle gördüğümüz en düşük fiyat');
    expect(reasonText('12% unit price advantage')).toBe('Birim fiyatı diğer tekliflerden %12 daha avantajlı');
  });
  it('builds need, deal and edit destinations from identifiers', () => {
    expect(routes.need('n1')).toEqual({ pathname: '/needs/[id]', params: { id: 'n1' } });
    expect(routes.deal('d1')).toEqual({ pathname: '/deals/[id]', params: { id: 'd1' } });
    expect(routes.form('n1')).toEqual({ pathname: '/need-form', params: { id: 'n1' } });
  });
});
