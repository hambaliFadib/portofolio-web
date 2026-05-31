export interface MonthYear {
  month: number;
  year: number;
}

export interface TimelineRange {
  start: MonthYear;
  end?: MonthYear;
  ongoing?: boolean;
}

type TimelineLocale = "en" | "id";

const monthYearFormatters: Record<TimelineLocale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }),
  id: new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }),
};

function getCurrentMonthYear(): MonthYear {
  const now = new Date();

  return {
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear(),
  };
}

function getResolvedEnd(range: TimelineRange): MonthYear {
  if (range.ongoing || !range.end) {
    return getCurrentMonthYear();
  }

  return range.end;
}

export function formatMonthYear(value: MonthYear, locale: TimelineLocale = "en") {
  return monthYearFormatters[locale].format(
    new Date(Date.UTC(value.year, value.month - 1, 1)),
  );
}

export function formatTimelineRange(range: TimelineRange, locale: TimelineLocale = "en") {
  const endLabel =
    range.ongoing || !range.end
      ? locale === "id"
        ? "Sekarang"
        : "Present"
      : formatMonthYear(range.end, locale);

  return `${formatMonthYear(range.start, locale)} – ${endLabel}`;
}

export function formatTimelineDuration(range: TimelineRange, locale: TimelineLocale = "en") {
  const end = getResolvedEnd(range);
  const totalMonths = Math.max(
    1,
    (end.year - range.start.year) * 12 + (end.month - range.start.month) + 1,
  );
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];

  if (years > 0) {
    parts.push(
      locale === "id" ? `${years} thn` : `${years} ${years === 1 ? "yr" : "yrs"}`,
    );
  }

  if (months > 0 || parts.length === 0) {
    parts.push(
      locale === "id" ? `${months} bln` : `${months} ${months === 1 ? "mo" : "mos"}`,
    );
  }

  return parts.join(" ");
}

export function formatTimelinePeriod(range: TimelineRange, locale: TimelineLocale = "en") {
  return `${formatTimelineRange(range, locale)} · ${formatTimelineDuration(range, locale)}`;
}
