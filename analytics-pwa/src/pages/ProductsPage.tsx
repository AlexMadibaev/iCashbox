import { TopProductsList } from '../components/Lists';
import type { MonthlyAnalytics } from '../types/analytics';

export function ProductsPage({ analytics }: { analytics: MonthlyAnalytics }) {
  return <div className="page"><TopProductsList items={analytics.topProducts} /></div>;
}
