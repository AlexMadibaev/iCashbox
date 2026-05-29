export function currentMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function monthParts(monthKey: string) {
  const [year, month] = monthKey.split('-');
  return { year, month };
}

export function previousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return date.toISOString().slice(0, 7);
}

export function humanDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short'
  });
}
