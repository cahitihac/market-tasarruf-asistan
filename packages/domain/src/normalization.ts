export interface ProductIdentity {
  ean?: string | null;
  name: string;
  brand?: string | null;
  category: string;
  quantity: number;
  unit: string;
  packageCount?: number;
}

export interface MatchSuggestion {
  match: ProductIdentity | null;
  confidence: number;
  reason: 'EAN' | 'ATTRIBUTES' | 'AMBIGUOUS' | 'NONE';
}

export interface ProductMatcher {
  suggest(raw: ProductIdentity, candidates: ProductIdentity[]): MatchSuggestion;
}

export function normalizeName(value: string): string {
  return value.toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\b(adet|tablet|li|lik)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function validEan(value: string | null | undefined): value is string {
  if (!value || !/^\d{8}$|^\d{13}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return check === (10 - sum % 10) % 10;
}

function tokens(value: string): Set<string> {
  return new Set(normalizeName(value).split(' ').filter(token => token.length > 1 && !/^\d+$/.test(token)));
}

export const deterministicMatcher: ProductMatcher = {
  suggest(raw, candidates) {
    if (validEan(raw.ean)) {
      const exact = candidates.find(candidate => candidate.ean === raw.ean);
      if (exact) return { match: exact, confidence: 1, reason: 'EAN' };
    }
    const rawTokens = tokens(raw.name);
    const scored = candidates.map(candidate => {
      if (normalizeName(candidate.category) !== normalizeName(raw.category) ||
          normalizeName(candidate.unit) !== normalizeName(raw.unit) ||
          candidate.quantity !== raw.quantity ||
          (candidate.packageCount ?? 1) !== (raw.packageCount ?? 1)) return { candidate, score: 0 };
      if (raw.brand && candidate.brand && normalizeName(raw.brand) !== normalizeName(candidate.brand)) return { candidate, score: 0 };
      const candidateTokens = tokens(candidate.name);
      const intersection = [...rawTokens].filter(token => candidateTokens.has(token)).length;
      const union = new Set([...rawTokens, ...candidateTokens]).size;
      return { candidate, score: union ? intersection / union : 0 };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best || best.score < 0.65) return { match: null, confidence: best?.score ?? 0, reason: 'NONE' };
    if (scored[1] && best.score - scored[1].score < 0.15) return { match: null, confidence: best.score, reason: 'AMBIGUOUS' };
    return { match: best.candidate, confidence: Math.min(0.95, best.score), reason: 'ATTRIBUTES' };
  },
};
