import type { IndicatorId } from '../shared/types';

export interface BodyRegion {
  id: string;
  label: string;
  indicatorIds: IndicatorId[];
}

export const bodyRegions: BodyRegion[] = [
  { id: 'head', label: 'Head', indicatorIds: ['sleep', 'mood'] },
  { id: 'chest', label: 'Chest', indicatorIds: ['heart-rate', 'blood-pressure'] },
  { id: 'abdomen', label: 'Abdomen', indicatorIds: ['blood-glucose'] },
  { id: 'whole-body', label: 'Whole body', indicatorIds: ['body-temperature'] },
];

const shapes: Record<string, { x: number; y: number; w: number; h: number; rx: number }> = {
  head: { x: 70, y: 10, w: 60, h: 60, rx: 30 },
  chest: { x: 50, y: 80, w: 100, h: 70, rx: 14 },
  abdomen: { x: 58, y: 156, w: 84, h: 60, rx: 14 },
  'whole-body': { x: 20, y: 228, w: 160, h: 40, rx: 20 },
};

export function BodyFigure(props: {
  regions: BodyRegion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <svg viewBox="0 0 200 280" className="body-figure" role="group" aria-label="Body figure. Choose a region to see its indicators.">
      {props.regions.map((region) => {
        const s = shapes[region.id];
        if (!s) return null;
        const selected = props.selectedId === region.id;
        return (
          <g
            key={region.id}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={region.label}
            className={`body-region${selected ? ' is-selected' : ''}`}
            onClick={() => props.onSelect(region.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                props.onSelect(region.id);
              }
            }}
          >
            <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} />
            <text x={s.x + s.w / 2} y={s.y + s.h / 2} textAnchor="middle" dominantBaseline="middle">
              {region.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
