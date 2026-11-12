export interface MonthYear {
  month: number;
  year: number;
}

export interface TimelineRange {
  start: MonthYear;
  end?: MonthYear;
  ongoing?: boolean;
}

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

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

export function formatMonthYear(value: MonthYear) {
  return monthYearFormatter.format(
    new Date(Date.UTC(value.year, value.month - 1, 1)),
  );
}

export function formatTimelineRange(range: TimelineRange) {
  const endLabel =
    range.ongoing || !range.end
      ? "Present"
      : formatMonthYear(range.end);

  return `${formatMonthYear(range.start)} – ${endLabel}`;
}

export function formatTimelineDuration(range: TimelineRange) {
  const end = getResolvedEnd(range);
  const totalMonths = Math.max(
    1,
    (end.year - range.start.year) * 12 + (end.month - range.start.month) + 1,
  );
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "yr" : "yrs"}`);
  }

  if (months > 0 || parts.length === 0) {
    parts.push(`${months} ${months === 1 ? "mo" : "mos"}`);
  }

  return parts.join(" ");
}

export function formatTimelinePeriod(range: TimelineRange) {
  return `${formatTimelineRange(range)} · ${formatTimelineDuration(range)}`;
}
