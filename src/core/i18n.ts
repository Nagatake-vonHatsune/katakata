import en from '../../i18n/en.json';
import ja from '../../i18n/ja.json';

export type Lang = 'ja' | 'en';
type Key = keyof typeof ja;
const dicts: Record<Lang, Record<string, string>> = { ja, en };
let lang: Lang = 'ja';

export function setLang(l: Lang): void {
  lang = l;
  document.documentElement.lang = l;
}

export function getLang(): Lang {
  return lang;
}

export function t(key: Key | string, params: Record<string, string | number> = {}): string {
  const s = dicts[lang][key] ?? dicts.ja[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}
