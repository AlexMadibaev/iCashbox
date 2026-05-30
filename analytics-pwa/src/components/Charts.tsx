import { formatMoney } from '../utils/money';

type Point = { label: string; value: number };

function maxValue(points: Point[]) {
  return Math.max(1, ...points.map((point) => point.value));
}

function shortDate(label: string) {
  return label.includes('-') ? label.slice(8) : label;
}

export function SalesLineChart({ points }: { points: Point[] }) {
  const width = 360;
  const height = 180;
  const max = maxValue(points);
  const path = points
    .map((point, index) => {
      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
      const y = height - (point.value / max) * (height - 28) - 14;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <strong>Выручка по дням</strong>
          <span>{points.length ? `${points.length} дней` : 'нет данных'}</span>
        </div>
        <em>{formatMoney(max)}</em>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <line x1="0" x2={width} y1="42" y2="42" />
        <line x1="0" x2={width} y1="96" y2="96" />
        <line x1="0" x2={width} y1="150" y2="150" />
        <path d={path} fill="none" stroke="#17201b" strokeLinecap="round" strokeWidth="4" />
        {points.map((point, index) => {
          const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
          const y = height - (point.value / max) * (height - 28) - 14;
          return <circle cx={x} cy={y} fill="#34a853" key={point.label} r="4" />;
        })}
      </svg>
      <div className="chart-scale">
        <span>{points[0] ? shortDate(points[0].label) : '-'}</span>
        <span>{points[points.length - 1] ? shortDate(points[points.length - 1].label) : '-'}</span>
      </div>
    </div>
  );
}

export function BarChart({ title, points }: { title: string; points: Point[] }) {
  const max = maxValue(points);
  return (
    <section className="chart-card">
      <div className="chart-head">
        <div>
          <strong>{title}</strong>
          <span>{points.length} строк</span>
        </div>
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
        <div>
          <strong>Оплаты</strong>
          <span>{formatMoney(total)}</span>
        </div>
      </div>
      <div className="pie-layout">
        <svg viewBox="0 0 42 42">
          <circle cx="21" cy="21" fill="transparent" r="15.9" stroke="#edf1ed" strokeWidth="7" />
          {entries.map(([method, value], index) => {
            const dash = (value / total) * 100;
            const stroke = ['#17201b', '#34a853', '#3b82f6', '#f59e0b', '#d9467a'][index % 5];
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
