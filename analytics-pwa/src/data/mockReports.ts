import type { DailyReport } from '../types/report';

const names = [
  ['drink-001', 'Айс Матча Клубника', 'Сезонные напитки', 35],
  ['drink-002', 'Мохито Блю Кюрасао', 'Напитки', 30],
  ['shake-001', 'Милкшейк Клубника Big', 'Милкшейки', 30],
  ['tea-001', 'Babl Tea Big', 'Напитки', 26],
  ['ice-001', 'Мороженое Клубника', 'Ice Cream', 20],
  ['coffee-001', 'Капучино', 'Кофе', 25]
] as const;

function makeReport(day: number, salesFactor = 1): DailyReport {
  const date = `2026-05-${String(day).padStart(2, '0')}`;
  const items = names.map(([id, name, category, price], index) => {
    const quantity = Math.max(2, Math.round((day + index * 3) * salesFactor) % 22);
    return { id, name, category, quantity, unit_price: price, total: quantity * price };
  });
  const categories = Array.from(new Set(items.map((item) => item.category))).map((category) => {
    const rows = items.filter((item) => item.category === category);
    return {
      name: category,
      quantity: rows.reduce((total, item) => total + item.quantity, 0),
      total: rows.reduce((total, item) => total + item.total, 0)
    };
  });
  const gross = items.reduce((total, item) => total + item.total, 0);
  const refunds = day % 6 === 0 ? 80 : 0;
  const discounts = day % 5 === 0 ? 60 : 20;
  const net = Math.max(0, gross - refunds - discounts);
  const cash = Math.round(net * 0.48);
  const card = Math.round(net * 0.34);
  const online = net - cash - card;
  const checks = Math.max(1, Math.round(items.reduce((total, item) => total + item.quantity, 0) / 2.4));

  return {
    report_id: `SHIFT-${date}-001`,
    date,
    shift_opened_at: `${date}T09:00:00+05:00`,
    shift_closed_at: `${date}T23:30:00+05:00`,
    cashier_name: day % 2 ? 'Кассир 1' : 'Кассир 2',
    shift_id: `shift-${date}`,
    status: 'closed',
    totals: {
      gross_sales: gross,
      net_sales: net,
      cash,
      card,
      online,
      discounts,
      refunds,
      checks_count: checks,
      cancelled_checks_count: day % 7 === 0 ? 2 : 0,
      average_check: net / checks,
      payments: { Наличные: cash, Карта: card, Онлайн: online }
    },
    items,
    categories,
    meta: {
      source: 'mock',
      created_at: `${date}T23:31:00+05:00`,
      updated_at: `${date}T23:31:00+05:00`
    }
  };
}

export const mockReports: DailyReport[] = Array.from({ length: 29 }, (_, index) =>
  makeReport(index + 1, 0.82 + ((index % 8) * 0.07))
);
