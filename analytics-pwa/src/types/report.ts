export type ReportStatus = 'closed' | 'pending' | 'error';

export type PaymentTotals = {
  gross_sales: number;
  net_sales: number;
  cash: number;
  card: number;
  online: number;
  discounts: number;
  refunds: number;
  checks_count: number;
  cancelled_checks_count: number;
  average_check: number;
  payments?: Record<string, number>;
};

export type ReportItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type ReportCategory = {
  name: string;
  quantity: number;
  total: number;
};

export type DailyReport = {
  report_id: string;
  date: string;
  shift_opened_at: string;
  shift_closed_at: string;
  cashier_name: string;
  shift_id?: string;
  status: ReportStatus;
  totals: PaymentTotals;
  items: ReportItem[];
  categories: ReportCategory[];
  meta: {
    source: string;
    created_at: string;
    updated_at: string;
  };
};
