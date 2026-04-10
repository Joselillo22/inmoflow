"use client";

import { useTranslation } from "react-i18next";
import { formatCurrency, formatDate, formatDateTime, formatTime, formatDateLong, formatNumber, langToLocale } from "@/lib/utils/formatters";
import { useCallback } from "react";

export function useLocaleFormat() {
  const { i18n } = useTranslation();
  const locale = langToLocale(i18n.language);

  return {
    currency: useCallback((amount: number) => formatCurrency(amount, locale), [locale]),
    date: useCallback((date: Date | string) => formatDate(date, locale), [locale]),
    dateTime: useCallback((date: Date | string) => formatDateTime(date, locale), [locale]),
    time: useCallback((date: Date | string) => formatTime(date, locale), [locale]),
    dateLong: useCallback((date: Date | string) => formatDateLong(date, locale), [locale]),
    number: useCallback((num: number) => formatNumber(num, locale), [locale]),
    locale,
  };
}
