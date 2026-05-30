import { CategoryList } from '../components/Lists';
import { BarChart } from '../components/Charts';
import { PageHeader } from '../components/PageHeader';
import type { MonthlyAnalytics } from '../types/analytics';

export function CategoriesPage({ analytics }: { analytics: MonthlyAnalytics }) {
  return (
    <div className="page">
      <PageHeader
        kicker="Категории"
        title="Структура продаж"
        subtitle="Доля категорий в общей выручке."
      />
      <BarChart title="Продажи по категориям" points={analytics.categories.map((category) => ({ label: category.name, value: category.total }))} />
      <CategoryList categories={analytics.categories} />
    </div>
  );
}
