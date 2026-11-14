import type { HealthAlert, HealthIndicator } from "../shared/types";
import { alertOrder, indicatorName } from "../ui/labels";
import { AlertLevelBadge } from "./Badges";

export function AlertBanner(props: {
  alerts: HealthAlert[];
  indicators: HealthIndicator[];
  max?: number;
  onOpenAlerts: () => void;
}) {
  const max = props.max ?? 3;
  const sorted = [...props.alerts].sort(
    (a, b) => alertOrder[a.level] - alertOrder[b.level],
  );
  const shown = sorted.slice(0, max);

  if (sorted.length === 0) {
    return (
      <div className="banner banner-none" role="status">
        No active alerts
      </div>
    );
  }

  return (
    <div
      className={`banner banner-${shown[0].level}`}
      role="region"
      aria-label="Active alerts"
    >
      <ul className="banner-list">
        {shown.map((a) => (
          <li key={a.id}>
            <AlertLevelBadge level={a.level} />{" "}
            <strong>{indicatorName(props.indicators, a.indicatorId)}</strong>:{" "}
            {a.ruleLabel}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="link-button"
        onClick={props.onOpenAlerts}
      >
        {sorted.length > max ? `All ${sorted.length} alerts` : "Details"}
      </button>
    </div>
  );
}
