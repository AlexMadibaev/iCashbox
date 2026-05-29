import type { LiveSnapshot } from '../types/live';

export async function fetchLiveSnapshot(): Promise<LiveSnapshot | null> {
  const response = await fetch('/api/live/latest', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
