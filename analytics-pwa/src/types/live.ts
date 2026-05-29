export type LiveSnapshot = {
  ok?: boolean;
  updatedAt: string;
  shift: {
    cashier?: string;
    label: string;
    openedAt?: string;
    open: boolean;
  };
  summary: {
    average: number;
    checks: number;
    revenue: number;
  };
  payments: Array<{
    method: string;
    total: number;
  }>;
  recentOrders: Array<{
    id: string | number;
    items: string[];
    status: string;
    total: number;
  }>;
  topProducts: Array<{
    name: string;
    qty: number;
    total: number;
  }>;
};
