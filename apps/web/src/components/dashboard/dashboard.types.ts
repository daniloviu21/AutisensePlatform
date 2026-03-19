export type KpiMetric = {
  id: string;
  label: string;
  value: string | number;
  trend?: number; // porcentaje positivo o negativo
  trendLabel?: string;
  iconType: "users" | "medical" | "building" | "calendar" | "activity";
  color?: string;
};

export type ChartDataSeries = {
  name: string;
  data: number[];
  color?: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "success" | "info" | "warning" | "error";
};

export type DashboardData = {
  kpis: KpiMetric[];
  growthChart: {
    categories: string[];
    series: ChartDataSeries[];
  };
  distributionChart: {
    name: string;
    y: number;
    color?: string;
  }[];
  recentActivity: ActivityItem[];
};
