import { createNeedSchema, type CreateNeedInput, type NeedResponse, type UpdateNeedInput } from '@market/contracts';

export interface NeedFormState {
  name: string; category: string; preferredBrands: string; alternativeBrands: string; excludedBrands: string;
  minimumCount: string; minimumVolumeMl: string; maximumUnitPriceTry: string; allowAlternatives: boolean;
}
export const blankNeedForm: NeedFormState = { name: '', category: '', preferredBrands: '', alternativeBrands: '',
  excludedBrands: '', minimumCount: '', minimumVolumeMl: '', maximumUnitPriceTry: '', allowAlternatives: true };

export function needToForm(need: NeedResponse): NeedFormState {
  return { name: need.name, category: need.category ?? '', preferredBrands: need.preferredBrands?.join(', ') ?? '',
    alternativeBrands: need.alternativeBrands?.join(', ') ?? '', excludedBrands: need.excludedBrands?.join(', ') ?? '',
    minimumCount: need.minimumCount?.toString() ?? '', minimumVolumeMl: need.minimumVolumeMl?.toString() ?? '',
    maximumUnitPriceTry: need.maximumUnitPriceMinor ? (need.maximumUnitPriceMinor / 100).toString() : '',
    allowAlternatives: need.allowAlternatives ?? true };
}

function brands(value: string) { return value.split(',').map(item => item.trim()).filter(Boolean); }
function positiveInteger(value: string, label: string, errors: string[]) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) { errors.push(`${label} için sıfırdan büyük bir tam sayı gir.`); return undefined; }
  return parsed;
}

export function validateNeedForm(form: NeedFormState): { data?: CreateNeedInput; errors: string[] } {
  const errors: string[] = [];
  const count = positiveInteger(form.minimumCount, 'Minimum adet', errors);
  const volume = positiveInteger(form.minimumVolumeMl, 'Minimum miktar', errors);
  let price: number | undefined;
  if (form.maximumUnitPriceTry.trim()) {
    const numeric = Number(form.maximumUnitPriceTry.replace(',', '.'));
    price = Math.round(numeric * 100);
    if (!Number.isFinite(numeric) || !Number.isInteger(price) || price <= 0) {
      errors.push('Birim fiyat için sıfırdan büyük bir TL tutarı gir.'); price = undefined;
    }
  }
  const candidate = {
    name: form.name.trim(), ...(form.category.trim() ? { category: form.category.trim() } : {}),
    preferredBrands: brands(form.preferredBrands), alternativeBrands: brands(form.alternativeBrands),
    excludedBrands: brands(form.excludedBrands),
    ...(count ? { minimumCount: count } : {}), ...(volume ? { minimumVolumeMl: volume } : {}),
    ...(price ? { maximumUnitPriceMinor: price } : {}), allowAlternatives: form.allowAlternatives,
  };
  const parsed = createNeedSchema.safeParse(candidate);
  if (!parsed.success) errors.push(...parsed.error.issues.map(issue => issue.path[0] === 'name' ? 'Takip adı en az 2 karakter olmalı.' : 'Seçtiğin bilgileri kontrol et.'));
  return { data: errors.length || !parsed.success ? undefined : parsed.data, errors };
}

export function needUpdateFromForm(form: NeedFormState, existing: NeedResponse, validated: CreateNeedInput): UpdateNeedInput {
  return { ...validated,
    ...(existing.category && !form.category.trim() ? { category: null } : {}),
    ...(existing.minimumCount && !form.minimumCount.trim() ? { minimumCount: null } : {}),
    ...(existing.minimumVolumeMl && !form.minimumVolumeMl.trim() ? { minimumVolumeMl: null } : {}),
    ...(existing.maximumUnitPriceMinor && !form.maximumUnitPriceTry.trim() ? { maximumUnitPriceMinor: null } : {}),
  };
}
