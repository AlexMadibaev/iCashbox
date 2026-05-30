import { TopProductsList } from '../components/Lists';
import { PageHeader } from '../components/PageHeader';
import type { MonthlyAnalytics } from '../types/analytics';

export function ProductsPage({ analytics }: { analytics: MonthlyAnalytics }) {
  return (
    <div className="page">
      <PageHeader
        kicker="Ассортимент"
        title="Продажи товаров"
        subtitle="Какие позиции дают основную выручку за выбранный месяц."
      />
      <TopProductsList items={analytics.topProducts} />
    </div>
  );
}
