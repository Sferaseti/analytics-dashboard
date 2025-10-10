// Предопределенные шаблоны отчетов для различных типов данных UON

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  chartType: 'bar' | 'line' | 'pie' | 'scatter';
  dataSource: string;
  config: {
    xAxis: string;
    yAxis: string;
    groupBy?: string;
    dateRange: string;
    filters: Record<string, any>;
  };
  category: 'calls' | 'clients' | 'leads' | 'requests' | 'bills' | 'managers';
}

export const defaultReportTemplates: ReportTemplate[] = [
  // Шаблоны для звонков
  {
    id: 'calls-by-date',
    name: 'Количество звонков по дням',
    description: 'Показывает динамику количества звонков по дням',
    chartType: 'line',
    dataSource: 'uon_call_history',
    config: {
      xAxis: 'date',
      yAxis: 'totalCalls',
      dateRange: 'last_30_days',
      filters: {}
    },
    category: 'calls'
  },
  {
    id: 'calls-by-manager',
    name: 'Звонки по менеджерам',
    description: 'Распределение звонков между менеджерами',
    chartType: 'bar',
    dataSource: 'uon_call_history',
    config: {
      xAxis: 'managerName',
      yAxis: 'totalCalls',
      groupBy: 'manager_id',
      dateRange: 'last_30_days',
      filters: {}
    },
    category: 'calls'
  },
  {
    id: 'call-duration-stats',
    name: 'Статистика длительности звонков',
    description: 'Средняя длительность звонков по дням',
    chartType: 'line',
    dataSource: 'uon_call_history',
    config: {
      xAxis: 'date',
      yAxis: 'avgDuration',
      dateRange: 'last_30_days',
      filters: {}
    },
    category: 'calls'
  },

  // Шаблоны для клиентов
  {
    id: 'clients-overview',
    name: 'Обзор клиентов',
    description: 'Общая статистика по клиентам',
    chartType: 'pie',
    dataSource: 'uon_clients',
    config: {
      xAxis: 'status',
      yAxis: 'totalClients',
      dateRange: 'current_month',
      filters: {}
    },
    category: 'clients'
  },
  {
    id: 'new-clients-trend',
    name: 'Динамика новых клиентов',
    description: 'Количество новых клиентов по месяцам',
    chartType: 'bar',
    dataSource: 'uon_clients',
    config: {
      xAxis: 'date',
      yAxis: 'newClientsThisMonth',
      dateRange: 'last_90_days',
      filters: {}
    },
    category: 'clients'
  },

  // Шаблоны для лидов
  {
    id: 'leads-conversion',
    name: 'Конверсия лидов',
    description: 'Соотношение конвертированных и общих лидов',
    chartType: 'pie',
    dataSource: 'uon_leads',
    config: {
      xAxis: 'status',
      yAxis: 'totalLeads',
      dateRange: 'current_month',
      filters: {}
    },
    category: 'leads'
  },
  {
    id: 'leads-by-source',
    name: 'Лиды по источникам',
    description: 'Распределение лидов по источникам привлечения',
    chartType: 'bar',
    dataSource: 'uon_leads',
    config: {
      xAxis: 'source',
      yAxis: 'totalLeads',
      dateRange: 'last_30_days',
      filters: {}
    },
    category: 'leads'
  },

  // Шаблоны для заявок
  {
    id: 'requests-status',
    name: 'Статус заявок',
    description: 'Распределение заявок по статусам',
    chartType: 'pie',
    dataSource: 'uon_requests',
    config: {
      xAxis: 'status',
      yAxis: 'totalRequests',
      dateRange: 'current_month',
      filters: {}
    },
    category: 'requests'
  },
  {
    id: 'requests-completion-rate',
    name: 'Динамика выполнения заявок',
    description: 'Количество выполненных заявок по дням',
    chartType: 'line',
    dataSource: 'uon_requests',
    config: {
      xAxis: 'date',
      yAxis: 'completedRequests',
      dateRange: 'last_30_days',
      filters: {}
    },
    category: 'requests'
  },

  // Шаблоны для счетов
  {
    id: 'bills-revenue',
    name: 'Выручка по счетам',
    description: 'Динамика выручки по оплаченным счетам',
    chartType: 'bar',
    dataSource: 'uon_bills',
    config: {
      xAxis: 'date',
      yAxis: 'paidAmount',
      dateRange: 'last_90_days',
      filters: {}
    },
    category: 'bills'
  },
  {
    id: 'bills-payment-status',
    name: 'Статус оплаты счетов',
    description: 'Соотношение оплаченных и неоплаченных счетов',
    chartType: 'pie',
    dataSource: 'uon_bills',
    config: {
      xAxis: 'status',
      yAxis: 'totalBills',
      dateRange: 'current_month',
      filters: {}
    },
    category: 'bills'
  },
  {
    id: 'bills-amount-distribution',
    name: 'Распределение сумм счетов',
    description: 'Анализ сумм выставленных счетов',
    chartType: 'scatter',
    dataSource: 'uon_bills',
    config: {
      xAxis: 'date',
      yAxis: 'totalAmount',
      dateRange: 'last_30_days',
      filters: {}
    },
    category: 'bills'
  }
];

// Функция для получения шаблонов по категории
export function getTemplatesByCategory(category: ReportTemplate['category']): ReportTemplate[] {
  return defaultReportTemplates.filter(template => template.category === category);
}

// Функция для получения шаблона по ID
export function getTemplateById(id: string): ReportTemplate | undefined {
  return defaultReportTemplates.find(template => template.id === id);
}

// Функция для получения всех категорий
export function getCategories(): Array<{ key: ReportTemplate['category'], label: string }> {
  return [
    { key: 'calls', label: 'Звонки' },
    { key: 'clients', label: 'Клиенты' },
    { key: 'leads', label: 'Лиды' },
    { key: 'requests', label: 'Заявки' },
    { key: 'bills', label: 'Счета' },
    { key: 'managers', label: 'Менеджеры' }
  ];
}

// Функция для создания отчета из шаблона
export function createReportFromTemplate(template: ReportTemplate, customName?: string) {
  return {
    name: customName || template.name,
    description: template.description,
    chartType: template.chartType,
    dataSource: template.dataSource,
    xAxis: template.config.xAxis,
    yAxis: template.config.yAxis,
    groupBy: template.config.groupBy,
    dateRange: template.config.dateRange,
    filters: template.config.filters
  };
}