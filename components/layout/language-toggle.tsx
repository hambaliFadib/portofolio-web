"use client";

import { useLanguage } from "@/components/language-provider";
import { type Locale } from "@/data/i18n";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
}

const languageOptions: Locale[] = ["id", "en"];
const languageLabels: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};
const languageShortLabels: Record<Locale, string> = {
  id: "ID",
  en: "EN",
};

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language selection"
      className={cn(
        "inline-flex overflow-hidden rounded-full border border-primary p-0.5",
        className,
      )}
    >
      {languageOptions.map((option) => {
        const isActive = locale === option;

        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            aria-label={languageLabels[option]}
            title={languageLabels[option]}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-background text-primary hover:bg-primary/5",
            )}
            onClick={() => setLocale(option)}
          >
            <span aria-hidden="true">{languageShortLabels[option]}</span>
            <span className="sr-only">{languageLabels[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
