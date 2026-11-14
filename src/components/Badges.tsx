import type { LegendAlertLevel } from '../shared/types';
import { alertMeta } from '../ui/labels';

export function StatusBadge(props: { symbol: string; label: string; className: string }) {
  return (
    <span className={`badge ${props.className}`}>
      {props.symbol && (
        <span aria-hidden="true" className="badge-symbol">
          {props.symbol}
        </span>
      )}
      <span>{props.label}</span>
    </span>
  );
}

export function AlertLevelBadge({ level }: { level: LegendAlertLevel }) {
  return <StatusBadge {...alertMeta[level]} />;
}
