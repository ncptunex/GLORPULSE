import type { AstronautId, CrewProfile } from '../shared/types';

export function CrewSelector(props: {
  crew: CrewProfile[];
  selectedId: AstronautId;
  onSelect: (id: AstronautId) => void;
}) {
  return (
    <div className="crew-selector">
      <label htmlFor="crew-select">Astronaut</label>
      <select id="crew-select" value={props.selectedId} onChange={(e) => props.onSelect(e.target.value)}>
        {props.crew.map((c) => (
          <option key={c.astronautId} value={c.astronautId}>
            {c.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
