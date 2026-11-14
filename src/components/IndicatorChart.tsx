import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { seriesForMeasure } from "../logic/readingSeries";
import type {
  HealthIndicator,
  HealthSnapshot,
  HealthStatus,
} from "../shared/types";
import { formatNumber } from "../ui/labels";

function MeasureChart(props: {
  snapshot: HealthSnapshot;
  indicator: HealthIndicator;
  status: HealthStatus;
  measureIndex: number;
}) {
  const { snapshot, indicator, status, measureIndex } = props;
  const def = indicator.measures[measureIndex];
  const measureStatus = status.measures[measureIndex];
  const series = seriesForMeasure(
    snapshot.readings,
    snapshot.astronautId,
    indicator.id,
    def.key,
  );
  const byDay = new Map(series.map((p) => [p.missionDay, p.value]));
  const data: Array<{ day: number; value: number | null }> = [];
  for (let day = 1; day <= snapshot.evaluatedOnDay; day += 1)
    data.push({ day, value: byDay.get(day) ?? null });

  const baseline = measureStatus.baseline;
  const range = measureStatus.referenceRange;
  const title = `${def.label} (${def.unit})`;

  return (
    <figure className="chart-figure">
      <figcaption>
        <strong>{title}</strong>
        <span className="card-meta"> </span>
      </figcaption>
      <div
        className="chart-box"
        role="img"
        aria-label={`${title} for days 1 to ${snapshot.evaluatedOnDay}`}
      >
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#d3d9e4" />
            <XAxis
              dataKey="day"
              type="number"
              domain={[1, snapshot.evaluatedOnDay]}
              tickCount={8}
              allowDecimals={false}
            />
            <YAxis domain={["auto", "auto"]} width={44} />
            <Tooltip
              formatter={(v) => `${v} ${def.unit}`}
              labelFormatter={(d) => `Day ${d}`}
            />
            {baseline.state === "ready" && (
              <ReferenceArea
                y1={baseline.bandLow}
                y2={baseline.bandHigh}
                fill="#2b6cb0"
                fillOpacity={0.14}
                ifOverflow="extendDomain"
              />
            )}
            {baseline.state === "ready" && (
              <ReferenceLine
                y={baseline.centre}
                stroke="#2b6cb0"
                strokeDasharray="6 4"
                ifOverflow="extendDomain"
              />
            )}
            {range && range.low !== null && (
              <ReferenceLine
                y={range.low}
                stroke="#7a4b00"
                strokeDasharray="2 3"
                ifOverflow="extendDomain"
              />
            )}
            {range && range.high !== null && (
              <ReferenceLine
                y={range.high}
                stroke="#7a4b00"
                strokeDasharray="2 3"
                ifOverflow="extendDomain"
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#1a1f2b"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-table">
        <summary>Table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">{title}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.day}>
                <td>{p.day}</td>
                <td>
                  {p.value === null ? "no reading" : formatNumber(p.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function IndicatorChart(props: {
  snapshot: HealthSnapshot;
  indicator: HealthIndicator;
  status: HealthStatus;
}) {
  return (
    <>
      {props.indicator.measures.map((_, i) => (
        <MeasureChart
          key={props.indicator.measures[i].key}
          {...props}
          measureIndex={i}
        />
      ))}
    </>
  );
}
