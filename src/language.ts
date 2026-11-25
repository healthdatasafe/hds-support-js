/**
 * The language of `available` that `lang` asks for: itself whatever its case, else its language (`fr-CH` reads `fr`), else a
 * region of it (`pt` reads `pt-BR`). Null when there is none.
 */
export function pickLanguage (lang: string | null | undefined, available: readonly string[]): string | null {
  if (typeof lang !== 'string') return null;
  const wanted = lang.trim().replace(/_/g, '-').toLowerCase();
  if (wanted === '') return null;
  const base = wanted.split('-')[0];
  return available.find((l) => l.toLowerCase() === wanted) ??
    available.find((l) => l.toLowerCase() === base) ??
    available.find((l) => l.toLowerCase().split('-')[0] === base) ??
    null;
}
