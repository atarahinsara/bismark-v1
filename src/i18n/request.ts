import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const locales = ["fa", "en", "ku", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fa";

export const rtlLocales: Locale[] = ["fa", "ku", "ar"];

export function isRtl(locale: string): boolean {
  return (rtlLocales as readonly string[]).includes(locale);
}

/**
 * next-intl request configuration.
 *
 * Reads the active locale from the `locale` cookie (set by the language
 * switcher on the client). Falls back to the `Accept-Language` header and
 * finally to the default locale ("fa").
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerList = await headers();

  const cookieLocale = cookieStore.get("locale")?.value;
  const acceptLang = headerList.get("accept-language") ?? "";

  let locale: string = defaultLocale;

  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const accepted = acceptLang
      .split(",")
      .map((part) => part.split(";")[0].trim().toLowerCase().split("-")[0])
      .filter(Boolean);
    for (const lang of accepted) {
      if ((locales as readonly string[]).includes(lang as Locale)) {
        locale = lang;
        break;
      }
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
