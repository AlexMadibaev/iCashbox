export const money = new Intl.NumberFormat('ru-RU', {
  currency: 'TJS',
  maximumFractionDigits: 0,
  style: 'currency'
});

export function formatMoney(value: number) {
  return money.format(Number.isFinite(value) ? value : 0);
}
