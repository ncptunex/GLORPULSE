import type {
  AlertLevel,
  BaselinePosition,
  HealthIndicator,
  HealthReading,
  IndicatorId,
  LegendAlertLevel,
  MeasureDefinition,
  MissionDay,
  ReferenceStatus,
} from "../shared/types";

export const DISCLAIMER =
  "Decision support only. Not a diagnosis or a medical device. It does not replace medical professionals or mission protocols.";

export const positionMeta: Record<
  BaselinePosition,
  { symbol: string; label: string; className: string }
> = {
  "above-baseline": {
    symbol: "▲",
    label: "Above your baseline",
    className: "tone-above",
  },
  "within-baseline": {
    symbol: "●",
    label: "Within your baseline",
    className: "tone-within",
  },
  "below-baseline": {
    symbol: "▼",
    label: "Below your baseline",
    className: "tone-below",
  },
  "not-enough-data": {
    symbol: "…",
    label: "Not enough data",
    className: "tone-unknown",
  },
};

export const referenceMeta: Record<
  ReferenceStatus,
  { symbol: string; label: string; className: string }
> = {
  "within-reference": {
    symbol: "●",
    label: "Within reference range",
    className: "tone-within",
  },
  "outside-reference": {
    symbol: "▲",
    label: "Outside reference range",
    className: "tone-above",
  },
  "not-assessed": {
    symbol: "–",
    label: "No reference range",
    className: "tone-unknown",
  },
};

export const alertMeta: Record<
  LegendAlertLevel,
  { symbol: string; label: string; className: string }
> = {
  info: { symbol: "", label: "Info", className: "level-info" },
  watch: { symbol: "", label: "Watch", className: "level-watch" },
  action: { symbol: "", label: "Action", className: "level-action" },
  "contact-flight-surgeon": {
    symbol: "",
    label: "Urgent",
    className: "level-contact",
  },
};

export const alertOrder: Record<AlertLevel, number> = {
  action: 0,
  watch: 1,
  info: 2,
};

export function indicatorName(
  indicators: HealthIndicator[],
  id: IndicatorId | null,
): string {
  if (id === null) return "Symptom";
  return indicators.find((i) => i.id === id)?.displayName ?? id;
}

export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function formatReading(
  reading: HealthReading | null,
  indicator: HealthIndicator,
): string {
  if (!reading) return "No reading yet";
  if (reading.indicatorId === "blood-pressure") {
    return `${formatNumber(reading.systolic)}/${formatNumber(reading.diastolic)} ${indicator.measures[0].unit}`;
  }
  return `${formatNumber(reading.value)} ${indicator.measures[0].unit}`;
}

export function formatMeasure(
  value: number | null,
  measure: MeasureDefinition,
): string {
  return value === null
    ? "No reading yet"
    : `${formatNumber(value)} ${measure.unit}`;
}

export function formatLastMeasured(
  reading: HealthReading | null,
  daysAgo: number | null,
): string {
  if (!reading) return "not yet measured";
  if (daysAgo === 0) return `day ${reading.missionDay}, today`;
  if (daysAgo === 1) return `day ${reading.missionDay}, 1 day ago`;
  return `day ${reading.missionDay}, ${daysAgo ?? "?"} days ago`;
}

export function formatDays(days: MissionDay[]): string {
  return days.length === 0 ? "none" : days.join(", ");
}
