import type { LiveSnapshot } from '../types/live';
import { formatMoney } from '../utils/money';
import { StatCard } from '../components/StatCard';

export function LivePage({ snapshot }: { snapshot: LiveSnapshot | null }) {
  if (!snapshot) {
    return <div className="state">Live-данных пока нет</div>;
  }

  return (
    <div className="page">
      <section className="hero-panel">
        <span>{new Date(snapshot.updatedAt).toLocaleTimeString('ru-RU')}</span>
        <h1>{formatMoney(snapshot.summary.revenue)}</h1>
        <p>{snapshot.shift.label} · {snapshot.shift.open ? 'открыта' : 'закрыта'} · {snapshot.shift.cashier || 'кассир'}</p>
      </section>
      <div className="stat-grid">
        <StatCard label="Чеки" value={String(snapshot.summary.checks)} />
        <StatCard label="Средний чек" value={formatMoney(snapshot.summary.average)} />
      </div>
      <section className="panel">
        <div className="section-title"><h2>Оплаты</h2></div>
        <div className="category-list">
          {snapshot.payments.map((payment) => (
            <article key={payment.method}>
              <div><strong>{payment.method}</strong><span>сегодня</span></div>
              <em>{formatMoney(payment.total)}</em>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-title"><h2>Последние заказы</h2></div>
        <div className="category-list">
          {snapshot.recentOrders.map((order) => (
            <article key={order.id}>
              <div><strong>#{order.id}</strong><span>{order.items.join(', ')}</span></div>
              <em>{formatMoney(order.total)}</em>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-title"><h2>Топ товаров</h2></div>
        <div className="category-list">
          {snapshot.topProducts.map((product) => (
            <article key={product.name}>
              <div><strong>{product.name}</strong><span>{product.qty} шт</span></div>
              <em>{formatMoney(product.total)}</em>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
