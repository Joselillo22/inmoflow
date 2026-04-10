export function formatCurrency(amount: number, locale = "es-ES"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string, locale = "es-ES"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string, locale = "es-ES"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTime(date: Date | string, locale = "es-ES"): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateLong(date: Date | string, locale = "es-ES"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
  }).format(new Date(date));
}

export function formatNumber(num: number, locale = "es-ES"): string {
  return new Intl.NumberFormat(locale).format(num);
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 9) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return phone;
}

/** Map i18n language codes to Intl locale codes */
export function langToLocale(lang: string): string {
  const map: Record<string, string> = {
    es: "es-ES",
    en: "en-GB",
  };
  return map[lang] ?? "es-ES";
}
