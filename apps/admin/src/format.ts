export function money(value?: number | null, currency = 'TRY') {
  if (value == null) return '-';
  return `${(value / 100).toFixed(2)} ${currency}`;
}

export function dateTime(value?: string | Date | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function percent(value?: number | null) {
  return value == null ? '-' : `${Math.round(value * 100)}%`;
}

export function packageLabel(quantity?: number | null, unit?: string | null, count?: number | null) {
  if (!quantity || !unit) return '-';
  return `${count && count > 1 ? `${count} x ` : ''}${quantity} ${unit}`;
}
