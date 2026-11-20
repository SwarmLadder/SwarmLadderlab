import { en, type Key } from "./en";
// Register new interface languages here. `dir: "rtl"` flips the layout for Arabic, Hebrew, etc.
export const locales = { en: { strings: en, dir: "ltr" as "ltr" | "rtl", label: "English" } };
export type Locale = keyof typeof locales;
export const locale: Locale = "en";
export const dir = locales[locale].dir;
export function t(key: Key, vars: Record<string, string | number> = {}): string {
  const text: string = locales[locale].strings[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}
