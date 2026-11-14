import { useState } from 'react';
import { BodyFigure, bodyRegions } from '../components/BodyFigure';
import { Panel } from '../components/Panel';
import type { CrewData } from '../state/useCrewData';
import { formatLastMeasured, formatReading, positionMeta } from '../ui/labels';
import { StatusBadge } from '../components/Badges';
import type { GuidanceText } from '../shared/types';

function guidance(text: GuidanceText | null) {
  if (text === null) return null;
  return text.status === 'sourced' ? <p>{text.content}</p> : <p className="no-guidance">No sourced guidance available</p>;
}

export function BodyPage({ data }: { data: CrewData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { snapshot, indicators, profile } = data;
  const regions = bodyRegions
    .map((r) => ({ ...r, indicatorIds: r.indicatorIds.filter((id) => profile.trackedIndicators.includes(id)) }))
    .filter((r) => r.indicatorIds.length > 0);
  const region = regions.find((r) => r.id === selected) ?? null;

  return (
    <Panel id="body">
      <div className="body-layout">
        <BodyFigure regions={regions} selectedId={region?.id ?? null} onSelect={setSelected} />
        <div className="body-panel" aria-live="polite">
          {!region && <p>Select a region.</p>}
          {region && (
            <>
              <h3>{region.label}</h3>
              {region.indicatorIds.map((id) => {
                const indicator = indicators.find((i) => i.id === id);
                const status = snapshot.statuses.find((s) => s.indicatorId === id);
                if (!indicator || !status) return null;
                return (
                  <article key={id} className="card">
                    <h4>{indicator.displayName}</h4>
                    <p className="card-value">{formatReading(status.latestReading, indicator)}</p>
                    <p className="card-meta">
                      Last: {formatLastMeasured(status.latestReading, status.daysSinceLatestReading)}
                    </p>
                    <div className="badge-row">
                      {status.measures.map((m) => (
                        <StatusBadge key={m.measure} {...positionMeta[m.position]} />
                      ))}
                    </div>
                    <h5>Why it matters</h5>
                    {guidance(indicator.whyItMatters)}
                    <h5>How to measure</h5>
                    {guidance(indicator.howToMeasure)}
                    {indicator.contextNote && (
                      <>
                        <h5>Context</h5>
                        {guidance(indicator.contextNote)}
                      </>
                    )}
                  </article>
                );
              })}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
