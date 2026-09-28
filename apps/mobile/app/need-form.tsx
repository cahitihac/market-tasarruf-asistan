import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api, friendlyError } from '../src/api/client';
import { keys } from '../src/api/keys';
import { blankNeedForm, needToForm, needUpdateFromForm, validateNeedForm, type NeedFormState } from '../src/lib/need-form';
import { routes } from '../src/lib/navigation';
import { Button, Card, DataState, Header, Page, typography } from '../src/ui/components';
import { colors } from '../src/ui/theme';

const categories = [
  { label: 'Bulaşık tableti', value: 'dishwasher-tablets', name: 'Bulaşık makinesi tableti', brands: ['Finish', 'Fairy'] },
  { label: 'Zeytinyağı', value: 'olive-oil', name: 'Zeytinyağı', brands: ['Komili'] },
  { label: 'Kahve', value: 'coffee', name: 'Kahve', brands: ['Mehmet Efendi'] },
  { label: 'Yumurta', value: 'eggs', name: 'Yumurta', brands: ['Gezen'] },
] as const;

function Field({ label, value, onChangeText, placeholder, numeric = false, suffix }: { label: string; value: string;
  onChangeText: (value: string) => void; placeholder?: string; numeric?: boolean; suffix?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.inputRow}>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor="#84958C" keyboardType={numeric ? 'decimal-pad' : 'default'} style={styles.input} />
    {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}</View></View>;
}

function values(value: string) { return value.split(',').map(item => item.trim()).filter(Boolean); }
function BrandPicker({ label, value, suggestions, onChange }: { label: string; value: string; suggestions: string[]; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState('');
  const selected = values(value);
  const add = (brand: string) => {
    const clean = brand.trim();
    if (!clean || selected.some(item => item.toLocaleLowerCase('tr-TR') === clean.toLocaleLowerCase('tr-TR'))) return;
    onChange([...selected, clean].join(', ')); setDraft('');
  };
  const available = suggestions.filter(item => !selected.includes(item) &&
    (!draft.trim() || item.toLocaleLowerCase('tr-TR').includes(draft.toLocaleLowerCase('tr-TR'))));
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>
    {selected.length ? <View style={styles.chips}>{selected.map(item => <Pressable key={item} onPress={() => onChange(selected.filter(value => value !== item).join(', '))}
      style={[styles.chip, styles.chipSelected]}><Text style={styles.chipTextSelected}>{item}  ×</Text></Pressable>)}</View> : null}
    <View style={styles.brandInput}><TextInput accessibilityLabel={label} value={draft} onChangeText={setDraft}
      onSubmitEditing={() => add(draft)} placeholder="Marka ara veya ekle" placeholderTextColor="#84958C" style={styles.brandTextInput} />
      <Pressable onPress={() => add(draft)} accessibilityRole="button" style={styles.addBrand}><Text style={styles.addBrandText}>Ekle</Text></Pressable></View>
    {available.length ? <View style={styles.chips}>{available.map(item => <Pressable key={item} onPress={() => add(item)} style={styles.chip}>
      <Text style={styles.chipText}>+ {item}</Text></Pressable>)}</View> : null}
  </View>;
}

export default function NeedFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const client = useQueryClient();
  const [form, setForm] = useState<NeedFormState>(blankNeedForm);
  const [errors, setErrors] = useState<string[]>([]);
  const loadedId = useRef<string | null>(null);
  const existing = useQuery({ queryKey: keys.need(id ?? ''), queryFn: () => api.need(id!), enabled: Boolean(id) });
  useEffect(() => { if (id && existing.data && loadedId.current !== id) {
    setForm(needToForm(existing.data)); loadedId.current = id;
  } }, [id, existing.data]);
  const set = <K extends keyof NeedFormState>(key: K, value: NeedFormState[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const category = categories.find(item => item.value === form.category);
  const selectCategory = (item: typeof categories[number]) => setForm(previous => ({ ...previous,
    category: item.value, name: !previous.name.trim() || categories.some(entry => entry.name === previous.name) ? item.name : previous.name,
    minimumCount: item.value === 'olive-oil' ? '' : previous.minimumCount,
    minimumVolumeMl: item.value === 'olive-oil' ? previous.minimumVolumeMl : '',
  }));
  const save = useMutation({ mutationFn: async () => {
    const result = validateNeedForm(form);
    if (!result.data) { setErrors(result.errors); throw new Error('Lütfen eksik bilgileri kontrol et.'); }
    setErrors([]);
    return id && existing.data ? api.updateNeed(id, needUpdateFromForm(form, existing.data, result.data)) : api.createNeed(result.data);
  }, onSuccess: async need => {
    await Promise.all([client.invalidateQueries({ queryKey: keys.needs }), client.invalidateQueries({ queryKey: keys.need(need.id) }),
      client.invalidateQueries({ queryKey: keys.offers(need.id) })]);
    router.replace(routes.need(need.id));
  } });
  return <Page>
    <Header eyebrow={id ? 'TAKİBİNİ GÜNCELLE' : 'YENİ FİYAT TAKİBİ'} title={id ? 'Takibi Düzenle' : 'Ne almak istiyorsun?'}
      subtitle="Ürün grubunu ve senin için önemli olan tercihleri seç." />
    <DataState loading={Boolean(id) && existing.isPending} error={existing.error} onRetry={() => { void existing.refetch(); }}>
      <Card><Text style={styles.step}>1  ÜRÜN</Text>
        <Text style={styles.label}>Ürün grubu</Text>
        <View style={styles.categoryGrid}>{categories.map(item => <Pressable key={item.value} accessibilityRole="button"
          onPress={() => selectCategory(item)} style={[styles.category, form.category === item.value && styles.categorySelected]}>
          <Text style={styles.categoryIcon}>{item.value === 'dishwasher-tablets' ? '▦' : item.value === 'olive-oil' ? '◒' : item.value === 'coffee' ? '◉' : '○'}</Text>
          <Text style={[styles.categoryText, form.category === item.value && styles.chipTextSelected]}>{item.label}</Text></Pressable>)}</View>
        <Field label="Takip adı" value={form.name} onChangeText={value => set('name', value)} placeholder="Örn. Aylık bulaşık tableti" />
      </Card>
      <Card><Text style={styles.step}>2  MARKA TERCİHİ</Text>
        <BrandPicker label="Öncelikli markalar" value={form.preferredBrands} suggestions={[...(category?.brands ?? [])]}
          onChange={value => set('preferredBrands', value)} />
        <BrandPicker label="Olabilir dediğin markalar" value={form.alternativeBrands} suggestions={[...(category?.brands ?? [])]}
          onChange={value => set('alternativeBrands', value)} />
        <View style={styles.toggle}><View style={styles.toggleCopy}><Text style={styles.label}>Diğer markaları da göster</Text>
          <Text style={typography.muted}>Fiyatı avantajlıysa farklı markaları sonuçlara ekle.</Text></View>
          <Switch value={form.allowAlternatives} onValueChange={value => set('allowAlternatives', value)} trackColor={{ true: colors.green }} /></View>
      </Card>
      <Card><Text style={styles.step}>3  BOYUT VE BÜTÇE</Text>
        {form.category === 'olive-oil' ? <><Text style={styles.label}>En az ne kadar olsun?</Text>
          <View style={styles.chips}>{['500', '1000', '2000'].map(amount => <Pressable key={amount} onPress={() => set('minimumVolumeMl', amount)}
            style={[styles.chip, form.minimumVolumeMl === amount && styles.chipSelected]}><Text style={form.minimumVolumeMl === amount ? styles.chipTextSelected : styles.chipText}>
              {Number(amount) >= 1000 ? `${Number(amount) / 1000} litre` : `${amount} ml`}</Text></Pressable>)}</View>
          <Field label="Farklı miktar" value={form.minimumVolumeMl} onChangeText={value => set('minimumVolumeMl', value)} placeholder="1000" numeric suffix="ml" /></>
          : <><Text style={styles.label}>En az kaç adet olsun?</Text><View style={styles.chips}>{['20', '40', '60', '80'].map(amount => <Pressable key={amount}
            onPress={() => set('minimumCount', amount)} style={[styles.chip, form.minimumCount === amount && styles.chipSelected]}>
            <Text style={form.minimumCount === amount ? styles.chipTextSelected : styles.chipText}>{amount} adet</Text></Pressable>)}</View>
          <Field label="Farklı adet" value={form.minimumCount} onChangeText={value => set('minimumCount', value)} placeholder="40" numeric suffix="adet" /></>}
        <Field label="Birim başına ödeyeceğin en yüksek fiyat" value={form.maximumUnitPriceTry}
          onChangeText={value => set('maximumUnitPriceTry', value)} placeholder="İsteğe bağlı" numeric suffix="₺" />
      </Card>
      {errors.length ? <Card style={styles.errorBox}><Text style={styles.errorTitle}>Bu bilgileri kontrol et</Text>
        {errors.map((error, index) => <Text key={`${error}-${index}`} style={styles.errorText}>• {error}</Text>)}</Card> : null}
      {save.error && !errors.length ? <Text style={styles.errorText}>{friendlyError(save.error)}</Text> : null}
      <Button label={save.isPending ? 'Kaydediliyor…' : id ? 'Değişiklikleri Kaydet' : 'Takibe Başla'} onPress={() => save.mutate()} disabled={save.isPending} />
      <Button label="Vazgeç" onPress={() => router.back()} kind="quiet" />
    </DataState>
  </Page>;
}

const styles = StyleSheet.create({
  step: { color: colors.green, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  field: { gap: 7 }, label: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 12,
    backgroundColor: colors.surface }, input: { minHeight: 48, paddingHorizontal: 14, color: colors.ink, fontSize: 15, flex: 1 },
  suffix: { color: colors.muted, fontSize: 13, fontWeight: '700', paddingRight: 14 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  category: { width: '48%', minHeight: 74, borderRadius: 14, padding: 12, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.line, gap: 6 },
  categorySelected: { backgroundColor: colors.paleGreen, borderColor: colors.green },
  categoryIcon: { color: colors.green, fontSize: 19 }, categoryText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.line }, chipSelected: { backgroundColor: colors.paleGreen, borderColor: colors.green },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, chipTextSelected: { color: colors.darkGreen, fontSize: 12, fontWeight: '800' },
  brandInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  brandTextInput: { flex: 1, minHeight: 46, paddingHorizontal: 13, color: colors.ink },
  addBrand: { paddingHorizontal: 13, minHeight: 46, justifyContent: 'center' }, addBrandText: { color: colors.green, fontWeight: '800' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }, toggleCopy: { flex: 1, gap: 4 },
  errorBox: { backgroundColor: colors.paleRed, borderColor: colors.red }, errorTitle: { color: colors.red, fontWeight: '800' },
  errorText: { color: colors.red, fontSize: 13, lineHeight: 19 },
});
