import type { AlertLegendEntry } from "../shared/types";
import { AlertLevelBadge } from "./Badges";

export function AlertLegend({ legend }: { legend: AlertLegendEntry[] }) {
  return (
    <ul className="legend">
      {legend.map((entry) => (
        <li key={entry.level}>
          <AlertLevelBadge level={entry.level} />
          <span>{entry.description}</span>
        </li>
      ))}
    </ul>
  );
}
