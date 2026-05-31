"use client";

import { useLanguage } from "@/components/language-provider";
import { MarkedText } from "@/components/marked-text";
import type { Locale } from "@/data/i18n";

interface LocalizedTextProps {
  text: Record<Locale, string>;
}

export function LocalizedText({ text }: LocalizedTextProps) {
  const { locale } = useLanguage();

  return <MarkedText text={text[locale]} />;
}
