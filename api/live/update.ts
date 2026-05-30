import { handleOptions, requestBody, saveReportToGithub, sendJson, writeJsonToGithub } from '../_shared.js';

const livePath = process.env.LIVE_SNAPSHOT_PATH || 'live/latest.json';
const pushToken = process.env.LIVE_PUSH_TOKEN || '';

function tashkentDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Tashkent',
    year: 'numeric'
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function liveSnapshotToReport(snapshot: any, updatedAt: string) {
  const date = tashkentDateKey(new Date(updatedAt));
  const payments = (snapshot.payments || []).reduce((map: Record<string, number>, payment: any) => {
    map[payment.method || 'Оплата'] = Number(payment.total || 0);
    return map;
  }, {});
  const items = (snapshot.topProducts || []).map((product: any, index: number) => {
    const quantity = Number(product.qty || 0);
    const total = Number(product.total || 0);
    return {
      id: `live-${String(product.name || index).replace(/[^a-z0-9а-я-]+/gi, '-').toLowerCase()}`,
      name: product.name || 'Позиция',
      category: 'Live',
      quantity,
      unit_price: quantity > 0 ? total / quantity : total,
      total
    };
  });
  const itemsTotal = items.reduce((sum: number, item: any) => sum + Number(item.total || 0), 0);
  const revenue = Number(snapshot.summary.revenue || itemsTotal || 0);
  const checks = Number(snapshot.summary.checks || 0);
  const cash = Number(payments['Наличка'] || payments['Наличные'] || payments.Cash || 0);
  const card = Number(payments['Карта'] || payments.Card || 0);
  const online = Math.max(0, revenue - cash - card);

  return {
    report_id: `LIVE-${date}`,
    date,
    shift_opened_at: snapshot.shift.openedAt ? `${date}T${snapshot.shift.openedAt}:00+05:00` : updatedAt,
    shift_closed_at: updatedAt,
    cashier_name: snapshot.shift.cashier || 'Кассир',
    shift_id: snapshot.shift.label || `live-${date}`,
    status: snapshot.shift.open ? 'pending' : 'closed',
    totals: {
      gross_sales: revenue,
      net_sales: revenue,
      cash,
      card,
      online,
      discounts: 0,
      refunds: 0,
      checks_count: checks,
      cancelled_checks_count: 0,
      average_check: checks > 0 ? revenue / checks : Number(snapshot.summary.average || 0),
      payments
    },
    items,
    categories: [
      {
        name: 'Live',
        quantity: items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0),
        total: itemsTotal || revenue
      }
    ],
    meta: {
      source: 'live',
      created_at: updatedAt,
      updated_at: updatedAt
    }
  };
}

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) return;
  if (request.method !== 'POST') return sendJson(response, { error: 'Method not allowed' }, 405);

  try {
    const rawToken = request.headers?.['x-live-token'] || '';
    const headerToken = Array.isArray(rawToken) ? rawToken[0] || '' : String(rawToken);
    if (pushToken && headerToken !== pushToken) return sendJson(response, { error: 'Unauthorized' }, 401);

    const snapshot = requestBody(request);
    if (!snapshot?.summary || !snapshot?.shift) return sendJson(response, { error: 'Invalid live snapshot' }, 400);

    const updatedAt = new Date().toISOString();
    const payload = { ...snapshot, ok: true, updatedAt };
    const live = await writeJsonToGithub(livePath, payload, 'Update live cashbox snapshot');
    const report = await saveReportToGithub(liveSnapshotToReport(snapshot, updatedAt));
    return sendJson(response, { live, report });
  } catch (caught) {
    console.error(caught);
    return sendJson(response, { error: caught instanceof Error ? caught.message : 'Failed to update live snapshot' }, 500);
  }
}
