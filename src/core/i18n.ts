import en from '../../i18n/en.json';
import ja from '../../i18n/ja.json';
import ms from '../../i18n/ms.json';

export type Lang = 'ja' | 'en' | 'ms';
export const LANGS: Array<{ id: Lang; label: string }> = [
  { id: 'ja', label: '日本語' },
  { id: 'en', label: 'English' },
  { id: 'ms', label: 'Bahasa Melayu' },
];
type Key = keyof typeof ja;
const dicts: Record<Lang, Record<string, string>> = { ja, en, ms };
let lang: Lang = 'ja';

export function isLang(x: unknown): x is Lang {
  return x === 'ja' || x === 'en' || x === 'ms';
}

export function setLang(l: Lang): void {
  lang = l;
  document.documentElement.lang = l;
}

export function getLang(): Lang {
  return lang;
}

export function t(key: Key | string, params: Record<string, string | number> = {}): string {
  const s = dicts[lang][key] ?? dicts.en[key] ?? dicts.ja[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}
