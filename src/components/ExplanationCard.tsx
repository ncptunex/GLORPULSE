import type { GuidanceText, HealthExplanation, SourceReference } from '../shared/types';

function Guidance({ text, sources }: { text: GuidanceText; sources: SourceReference[] }) {
  if (text.status === 'no-sourced-guidance') return <p className="no-guidance">No sourced guidance available</p>;
  return (
    <p>
      {text.content}{' '}
      <span className="source-ids">
        {text.sourceIds.map((id) => {
          const src = sources.find((s) => s.id === id);
          return src ? (
            <a key={id} href={src.url} target="_blank" rel="noreferrer">
              [{id}]
            </a>
          ) : (
            <span key={id}>[{id}]</span>
          );
        })}
      </span>
    </p>
  );
}

export function ExplanationCard({ explanation, sources }: { explanation: HealthExplanation; sources: SourceReference[] }) {
  const hazards = explanation.hazards;
  return (
    <div className="why-now">
      <h4>Why now</h4>
      <dl>
        <dt>1. What changed</dt>
        <dd>{explanation.whatChanged}</dd>
        <dt>2. Compared with your baseline</dt>
        <dd>{explanation.baselineComparison}</dd>
        <dd className="card-meta">{explanation.referenceRangeNote}</dd>
        <dd className="card-meta">{explanation.missionLimitNote}</dd>
        <dt>3. Why it matters in space</dt>
        <dd>
          <Guidance text={explanation.whyItMatters} sources={sources} />
        </dd>
        <dt>4. Spaceflight hazards</dt>
        <dd>
          {hazards.status === 'sourced' ? (
            <ul className="tag-list">
              {hazards.content.map((h) => (
                <li key={h} className="tag">
                  {h.replace(/-/g, ' ')}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-guidance">No sourced guidance available</p>
          )}
        </dd>
        <dt>5. Next steps</dt>
        <dd>
          <Guidance text={explanation.nextSteps} sources={sources} />
        </dd>
        <dt>6. When to contact the flight surgeon</dt>
        <dd>
          <p>{explanation.whenToContactFlightSurgeon.appliedRule}</p>
          {!explanation.whenToContactFlightSurgeon.automaticContactRuleDefined && (
            <p className="card-meta">This prototype has no automatic rule for contacting the flight surgeon.</p>
          )}
          <Guidance text={explanation.whenToContactFlightSurgeon.guidance} sources={sources} />
        </dd>
      </dl>
      <p className="card-meta">{explanation.disclaimer}</p>
    </div>
  );
}
