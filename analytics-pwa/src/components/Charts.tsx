import { formatMoney } from '../utils/money';

type Point = { label: string; value: number };

function maxValue(points: Point[]) {
  return Math.max(1, ...points.map((point) => point.value));
}

export function SalesLineChart({ points }: { points: Point[] }) {
  const width = 360;
  const height = 180;
  const max = maxValue(points);
  const path = points
    .map((point, index) => {
      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
      const y = height - (point.value / max) * (height - 24) - 12;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="chart-card">
      <div className="chart-head">
        <strong>Выручка по дням</strong>
        <span>{formatMoney(max)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <path d={path} fill="none" stroke="#17201b" strokeLinecap="round" strokeWidth="4" />
        {points.map((point, index) => {
          const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
          const y = height - (point.value / max) * (height - 24) - 12;
          return <circle cx={x} cy={y} fill="#b7f071" key={point.label} r="4" />;
        })}
      </svg>
    </div>
  );
}

export function BarChart({ title, points }: { title: string; points: Point[] }) {
  const max = maxValue(points);
  return (
    <section className="chart-card">
      <div className="chart-head">
        <strong>{title}</strong>
      </div>
      <div className="bar-list">
        {points.map((point) => (
          <div className="bar-row" key={point.label}>
            <span>{point.label}</span>
            <div><b style={{ width: `${Math.max(4, (point.value / max) * 100)}%` }} /></div>
            <strong>{formatMoney(point.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PaymentPieChart({ payments }: { payments: Record<string, number> }) {
  const entries = Object.entries(payments).filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
  let offset = 25;
  return (
    <section className="chart-card pie-card">
      <div className="chart-head">
        <strong>Способы оплаты</strong>
      </div>
      <div className="pie-layout">
        <svg viewBox="0 0 42 42">
          {entries.map(([method, value], index) => {
            const dash = (value / total) * 100;
            const stroke = ['#17201b', '#7fbf2f', '#91a6ff', '#ffb86b', '#d474a2'][index % 5];
            const circle = (
              <circle
                cx="21"
                cy="21"
                fill="transparent"
                key={method}
                r="15.9"
                stroke={stroke}
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={offset}
                strokeWidth="7"
              />
            );
            offset -= dash;
            return circle;
          })}
        </svg>
        <div className="legend-list">
          {entries.map(([method, value]) => (
            <div key={method}><span>{method}</span><strong>{formatMoney(value)}</strong></div>
          ))}
        </div>
      </div>
    </section>
  );
}
