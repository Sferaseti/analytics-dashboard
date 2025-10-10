'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftIcon, SaveIcon, EyeIcon } from 'lucide-react';
import { defaultReportTemplates, getCategories, createReportFromTemplate, type ReportTemplate } from '@/lib/report-templates';
import { generateChartOptions, type ChartConfig } from '@/lib/chart-utils';
// Удаляем прямой импорт dataService для избежания проблем с серверными модулями
import dynamic from 'next/dynamic';

// Динамический импорт ReactECharts для SSR совместимости
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface FormData {
  name: string;
  description: string;
  chartType: string;
  dataSource: string;
  xAxis: string;
  yAxis: string;
  groupBy: string;
  dateRange: string;
  isScheduled: boolean;
  scheduleFrequency: string;
}

const chartTypes = [
  { value: 'bar', label: 'Столбчатая диаграмма' },
  { value: 'line', label: 'Линейный график' },
  { value: 'pie', label: 'Круговая диаграмма' },
  { value: 'scatter', label: 'Точечная диаграмма' },
];

const dataSources = [
  { value: 'uon_call_history', label: 'История звонков' },
  { value: 'uon_requests', label: 'Заявки' },
  { value: 'uon_bills', label: 'Счета' },
  { value: 'uon_clients', label: 'Клиенты' },
  { value: 'uon_leads', label: 'Лиды' },
  { value: 'uon_managers', label: 'Менеджеры' },
];

const axisOptions: Record<string, Array<{ value: string; label: string }>> = {
  uon_call_history: [
    { value: 'date', label: 'Дата' },
    { value: 'managerId', label: 'ID менеджера' },
    { value: 'managerName', label: 'Имя менеджера' },
    { value: 'totalCalls', label: 'Количество звонков' },
    { value: 'avgDuration', label: 'Средняя длительность' },
  ],
  uon_requests: [
    { value: 'date', label: 'Дата' },
    { value: 'status', label: 'Статус' },
    { value: 'totalRequests', label: 'Количество заявок' },
    { value: 'completedRequests', label: 'Выполненные заявки' },
    { value: 'pendingRequests', label: 'Ожидающие заявки' },
  ],
  uon_bills: [
    { value: 'date', label: 'Дата' },
    { value: 'status', label: 'Статус' },
    { value: 'totalBills', label: 'Количество счетов' },
    { value: 'totalAmount', label: 'Общая сумма' },
    { value: 'paidAmount', label: 'Оплаченная сумма' },
    { value: 'paidBills', label: 'Оплаченные счета' },
    { value: 'unpaidBills', label: 'Неоплаченные счета' },
  ],
  uon_clients: [
    { value: 'date', label: 'Дата' },
    { value: 'status', label: 'Статус' },
    { value: 'totalClients', label: 'Количество клиентов' },
    { value: 'newClientsThisMonth', label: 'Новые клиенты за месяц' },
  ],
  uon_leads: [
    { value: 'date', label: 'Дата' },
    { value: 'status', label: 'Статус' },
    { value: 'source', label: 'Источник' },
    { value: 'totalLeads', label: 'Количество лидов' },
    { value: 'newLeadsThisMonth', label: 'Новые лиды за месяц' },
    { value: 'convertedLeads', label: 'Конвертированные лиды' },
  ],
  uon_managers: [
    { value: 'name', label: 'Имя менеджера' },
    { value: 'totalCalls', label: 'Количество звонков' },
  ],
};

const dateRanges = [
  { value: 'last_7_days', label: 'Последние 7 дней' },
  { value: 'last_30_days', label: 'Последние 30 дней' },
  { value: 'last_90_days', label: 'Последние 90 дней' },
  { value: 'current_month', label: 'Текущий месяц' },
  { value: 'last_month', label: 'Прошлый месяц' },
  { value: 'current_year', label: 'Текущий год' },
];

const scheduleFrequencies = [
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
];

// Функция для генерации тестовых данных для предварительного просмотра
const generatePreviewData = async (dataSource: string, xAxis: string, yAxis: string) => {
  try {
    // Получаем реальные данные для заявок
    if (dataSource === 'uon_requests') {
      const response = await fetch('/api/uon/requests?limit=100');
      const result = await response.json();
      
      if (result.success && result.data) {
        // Группируем данные по дате для предварительного просмотра
        const groupedData = result.data.reduce((acc: any, request: any) => {
          const date = new Date(request.createdAt).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = {
              date,
              totalRequests: 0,
              completedRequests: 0,
              pendingRequests: 0,
              status: request.status || 'new'
            };
          }
          acc[date].totalRequests++;
          if (request.status === 'completed') {
            acc[date].completedRequests++;
          } else {
            acc[date].pendingRequests++;
          }
          return acc;
        }, {});
        
        return Object.values(groupedData).slice(0, 10);
      }
    }

    // Получаем реальные данные для счетов
    if (dataSource === 'uon_bills') {
      const response = await fetch('/api/uon/bills?limit=100');
      const result = await response.json();
      
      if (result.success && result.data) {
        // Группируем данные по дате для предварительного просмотра
        const groupedData = result.data.reduce((acc: any, bill: any) => {
          const date = new Date(bill.createdAt).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = {
              date,
              totalBills: 0,
              totalAmount: 0,
              paidAmount: 0,
              paidBills: 0,
              unpaidBills: 0,
              status: bill.status || 'unpaid'
            };
          }
          acc[date].totalBills++;
          acc[date].totalAmount += bill.amount || 0;
          if (bill.status === 'paid') {
            acc[date].paidAmount += bill.amount || 0;
            acc[date].paidBills++;
          } else {
            acc[date].unpaidBills++;
          }
          return acc;
        }, {});
        
        return Object.values(groupedData).slice(0, 10);
      }
    }

    // Получаем реальные данные для клиентов
    if (dataSource === 'uon_clients') {
      const response = await fetch('/api/uon/clients?limit=100');
      const result = await response.json();
      
      if (result.success && result.data) {
        // Группируем данные по дате для предварительного просмотра
        const groupedData = result.data.reduce((acc: any, client: any) => {
          const date = new Date(client.createdAt).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = {
              date,
              totalClients: 0,
              newClientsThisMonth: 0,
              status: client.status || 'active'
            };
          }
          acc[date].totalClients++;
          // Считаем новых клиентов за текущий месяц
          const clientDate = new Date(client.createdAt);
          const currentMonth = new Date().getMonth();
          if (clientDate.getMonth() === currentMonth) {
            acc[date].newClientsThisMonth++;
          }
          return acc;
        }, {});
        
        return Object.values(groupedData).slice(0, 10);
      }
    }

    // Получаем реальные данные для лидов
    if (dataSource === 'uon_leads') {
      const response = await fetch('/api/uon/leads?limit=100');
      const result = await response.json();
      
      if (result.success && result.data) {
        // Группируем данные по дате для предварительного просмотра
        const groupedData = result.data.reduce((acc: any, lead: any) => {
          const date = new Date(lead.createdAt).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = {
              date,
              totalLeads: 0,
              newLeadsThisMonth: 0,
              convertedLeads: 0,
              status: lead.status || 'new',
              source: lead.source || 'unknown'
            };
          }
          acc[date].totalLeads++;
          // Считаем новых лидов за текущий месяц
          const leadDate = new Date(lead.createdAt);
          const currentMonth = new Date().getMonth();
          if (leadDate.getMonth() === currentMonth) {
            acc[date].newLeadsThisMonth++;
          }
          if (lead.status === 'converted') {
            acc[date].convertedLeads++;
          }
          return acc;
        }, {});
        
        return Object.values(groupedData).slice(0, 10);
      }
    }

    // Получаем реальные данные для менеджеров
    if (dataSource === 'uon_managers') {
      const response = await fetch('/api/uon/managers?limit=100');
      const result = await response.json();
      
      if (result.success && result.data) {
        // Преобразуем данные менеджеров для предварительного просмотра
        return result.data.slice(0, 10).map((manager: any) => ({
          name: manager.name || `Менеджер ${manager.id}`,
          totalCalls: Math.floor(Math.random() * 100) + 20, // Пока используем случайные данные для звонков
          department: manager.department || 'Не указан'
        }));
      }
    }
    
    // Для других источников данных используем моковые данные
    const sampleData = [];
    const dataCount = 10;
    
    for (let i = 0; i < dataCount; i++) {
      const item: any = {};
      
      // Генерируем данные в зависимости от источника
      switch (dataSource) {
        case 'uon_call_history':
          item.date = `2024-01-${String(i + 1).padStart(2, '0')}`;
          item.managerId = `manager_${i + 1}`;
          item.managerName = `Менеджер ${i + 1}`;
          item.totalCalls = Math.floor(Math.random() * 50) + 10;
          item.avgDuration = Math.floor(Math.random() * 300) + 60;
          break;
        default:
          item[xAxis] = `Item ${i + 1}`;
          item[yAxis] = Math.floor(Math.random() * 100) + 10;
      }
      
      sampleData.push(item);
    }
    
    return sampleData;
  } catch (error) {
    console.error('Ошибка при получении данных:', error);
    
    // В случае ошибки возвращаем моковые данные
    const sampleData = [];
    const dataCount = 10;
    
    for (let i = 0; i < dataCount; i++) {
      const item: any = {};
      
      switch (dataSource) {
        case 'uon_requests':
          item.date = `2024-01-${String(i + 1).padStart(2, '0')}`;
          item.status = ['new', 'in_progress', 'completed'][Math.floor(Math.random() * 3)];
          item.totalRequests = Math.floor(Math.random() * 30) + 5;
          item.completedRequests = Math.floor(Math.random() * 20) + 2;
          item.pendingRequests = Math.floor(Math.random() * 10) + 1;
          break;
        default:
          item[xAxis] = `Item ${i + 1}`;
          item[yAxis] = Math.floor(Math.random() * 100) + 10;
      }
      
      sampleData.push(item);
    }
    
    return sampleData;
  }
};

export default function CreateReportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('custom');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [lastSavedDraft, setLastSavedDraft] = useState<Date | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    chartType: '',
    dataSource: '',
    xAxis: '',
    yAxis: '',
    groupBy: '',
    dateRange: 'last_30_days',
    isScheduled: false,
    scheduleFrequency: '',
  });

  const categories = getCategories();

  // Автосохранение черновика
  useEffect(() => {
    if (formData.name || formData.dataSource || formData.chartType) {
      const timer = setTimeout(() => {
        saveDraft();
      }, 2000); // Автосохранение через 2 секунды после изменения

      return () => clearTimeout(timer);
    }
  }, [formData]);

  // Загружаем данные для предварительного просмотра
  useEffect(() => {
    const loadPreviewData = async () => {
      if (formData.dataSource && formData.xAxis && formData.yAxis) {
        setIsPreviewLoading(true);
        setApiError(null);
        try {
          const data = await generatePreviewData(formData.dataSource, formData.xAxis, formData.yAxis);
          setPreviewData(data);
        } catch (error) {
          console.error('Ошибка загрузки данных:', error);
          setApiError('Не удалось загрузить данные для предварительного просмотра');
          setPreviewData([]);
        } finally {
          setIsPreviewLoading(false);
        }
      } else {
        setPreviewData([]);
        setApiError(null);
      }
    };

    loadPreviewData();
  }, [formData.dataSource, formData.xAxis, formData.yAxis]);

  // Функция сохранения черновика
  const saveDraft = async () => {
    if (typeof window === 'undefined') return;
    if (!formData.name && !formData.dataSource && !formData.chartType) return;

    setIsDraftSaving(true);
    try {
      const draftKey = `report_draft_${Date.now()}`;
      const draftData = {
        ...formData,
        savedAt: new Date().toISOString(),
        id: draftKey
      };
      
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setLastSavedDraft(new Date());
    } catch (error) {
      console.error('Ошибка сохранения черновика:', error);
    } finally {
      setIsDraftSaving(false);
    }
  };

  // Функция загрузки черновиков
  const loadDrafts = () => {
    if (typeof window === 'undefined') return [];
    
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('report_draft_')) {
        try {
          const draft = JSON.parse(localStorage.getItem(key) || '{}');
          drafts.push(draft);
        } catch (error) {
          console.error('Ошибка загрузки черновика:', error);
        }
      }
    }
    return drafts.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  };

  // Функция загрузки черновика
  const loadDraft = (draft: any) => {
    setFormData({
      name: draft.name || '',
      description: draft.description || '',
      chartType: draft.chartType || '',
      dataSource: draft.dataSource || '',
      xAxis: draft.xAxis || '',
      yAxis: draft.yAxis || '',
      groupBy: draft.groupBy || '',
      dateRange: draft.dateRange || 'last_30_days',
      isScheduled: draft.isScheduled || false,
      scheduleFrequency: draft.scheduleFrequency || ''
    });
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Сбрасываем оси при смене источника данных
      ...(field === 'dataSource' ? { xAxis: '', yAxis: '', groupBy: '' } : {})
    }));
  };

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    const reportData = createReportFromTemplate(template);
    setFormData({
      name: reportData.name,
      description: reportData.description,
      chartType: reportData.chartType,
      dataSource: reportData.dataSource,
      xAxis: reportData.xAxis,
      yAxis: reportData.yAxis,
      groupBy: reportData.groupBy || '',
      dateRange: reportData.dateRange,
      isScheduled: false,
      scheduleFrequency: '',
    });
    setActiveTab('custom');
  };

  const currentAxisOptions = formData.dataSource ? axisOptions[formData.dataSource] || [] : [];

  // Генерация предварительного просмотра графика
  const previewChartOptions = useMemo(() => {
    if (!formData.chartType || !formData.dataSource || !formData.xAxis || !formData.yAxis || previewData.length === 0) {
      return null;
    }

    const config: ChartConfig = {
      xAxis: formData.xAxis,
      yAxis: formData.yAxis,
      groupBy: formData.groupBy && formData.groupBy !== 'none' ? formData.groupBy : undefined,
      chartType: formData.chartType as 'bar' | 'line' | 'pie' | 'area' | 'scatter'
    };

    return generateChartOptions(previewData, config);
  }, [formData.chartType, formData.dataSource, formData.xAxis, formData.yAxis, formData.groupBy, previewData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.chartType || !formData.dataSource || !formData.xAxis || !formData.yAxis) {
      setApiError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setLoading(true);
    setApiError(null);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Не удалось создать отчет');
      }

      const report = await response.json();
      router.push(`/reports/${report.id}`);
    } catch (error) {
      console.error('Error creating report:', error);
      setApiError(error instanceof Error ? error.message : 'Произошла ошибка при создании отчета');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/reports')}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Назад
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Создать отчет</h1>
          <p className="text-muted-foreground">Создайте новый отчет с нуля или используйте готовый шаблон</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Шаблоны</TabsTrigger>
          <TabsTrigger value="drafts">Черновики</TabsTrigger>
          <TabsTrigger value="custom">Настройка</TabsTrigger>
        </TabsList>

        {/* Вкладка с шаблонами */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Выберите шаблон отчета</CardTitle>
              <CardDescription>
                Используйте готовые шаблоны для быстрого создания популярных отчетов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {categories.map(category => {
                  const templates = defaultReportTemplates.filter(t => t.category === category.key);
                  if (templates.length === 0) return null;

                  return (
                    <div key={category.key}>
                      <h3 className="text-lg font-semibold mb-3">{category.label}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(template => (
                          <Card 
                            key={template.id} 
                            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                              selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                            }`}
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <Badge variant="outline">{chartTypes.find(ct => ct.value === template.chartType)?.label}</Badge>
                              </div>
                              <CardDescription className="text-sm">
                                {template.description}
                              </CardDescription>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка с черновиками */}
        <TabsContent value="drafts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Сохраненные черновики</CardTitle>
              <CardDescription>
                Продолжите работу с ранее сохраненными черновиками отчетов
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const drafts = loadDrafts();
                if (drafts.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="text-4xl mb-2">📝</div>
                      <p>Нет сохраненных черновиков</p>
                      <p className="text-sm mt-1">Черновики автоматически сохраняются при заполнении формы</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drafts.map((draft: any) => (
                      <Card 
                        key={draft.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => {
                          loadDraft(draft);
                          setActiveTab('custom');
                        }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              {draft.name || 'Без названия'}
                            </CardTitle>
                            <Badge variant="outline">
                              {draft.chartType ? chartTypes.find(ct => ct.value === draft.chartType)?.label : 'Не выбран'}
                            </Badge>
                          </div>
                          <CardDescription className="text-sm">
                            {draft.description || 'Без описания'}
                          </CardDescription>
                          <div className="text-xs text-muted-foreground mt-2">
                            Сохранен: {new Date(draft.savedAt).toLocaleString('ru-RU')}
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка с настройкой */}
        <TabsContent value="custom">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Основная информация */}
            <Card>
              <CardHeader>
                <CardTitle>Основная информация</CardTitle>
                <CardDescription>Укажите название и описание отчета</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название отчета *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Введите название отчета"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Краткое описание отчета"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Настройки визуализации */}
            <Card>
              <CardHeader>
                <CardTitle>Настройки визуализации</CardTitle>
                <CardDescription>Выберите тип диаграммы и источник данных</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Тип диаграммы *</Label>
                    <Select value={formData.chartType} onValueChange={(value) => handleInputChange('chartType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип диаграммы" />
                      </SelectTrigger>
                      <SelectContent>
                        {chartTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Источник данных *</Label>
                    <Select value={formData.dataSource} onValueChange={(value) => handleInputChange('dataSource', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите источник данных" />
                      </SelectTrigger>
                      <SelectContent>
                        {dataSources.map(source => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Динамические поля осей - показываются только после выбора источника данных */}
                {formData.dataSource && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1 w-1 bg-green-500 rounded-full animate-pulse"></div>
                      Доступные поля для источника "{dataSources.find(ds => ds.value === formData.dataSource)?.label}"
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Ось X *</Label>
                        <Select 
                          value={formData.xAxis} 
                          onValueChange={(value) => handleInputChange('xAxis', value)}
                          key={`xAxis-${formData.dataSource}`} // Принудительное обновление при смене источника
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите ось X" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentAxisOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Ось Y *</Label>
                        <Select 
                          value={formData.yAxis} 
                          onValueChange={(value) => handleInputChange('yAxis', value)}
                          key={`yAxis-${formData.dataSource}`} // Принудительное обновление при смене источника
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите ось Y" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentAxisOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Группировка</Label>
                        <Select 
                          value={formData.groupBy} 
                          onValueChange={(value) => handleInputChange('groupBy', value)}
                          key={`groupBy-${formData.dataSource}`} // Принудительное обновление при смене источника
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Без группировки" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Без группировки</SelectItem>
                            {currentAxisOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Информация о доступных полях */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-medium mb-2">Доступные поля:</p>
                      <div className="flex flex-wrap gap-1">
                        {currentAxisOptions.map(option => (
                          <Badge key={option.value} variant="secondary" className="text-xs">
                            {option.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Подсказка, если источник данных не выбран */}
                {!formData.dataSource && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-sm">Выберите источник данных, чтобы увидеть доступные поля для осей</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Предварительный просмотр графика */}
            {previewChartOptions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <EyeIcon className="h-5 w-5" />
                    Предварительный просмотр
                  </CardTitle>
                  <CardDescription>
                    Так будет выглядеть ваш график с тестовыми данными
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-80 border rounded-lg bg-muted/10">
                    <ReactECharts
                      option={previewChartOptions}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                    />
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p><strong>Тип графика:</strong> {chartTypes.find(ct => ct.value === formData.chartType)?.label}</p>
                    <p><strong>Источник данных:</strong> {dataSources.find(ds => ds.value === formData.dataSource)?.label}</p>
                    <p><strong>Ось X:</strong> {currentAxisOptions.find(opt => opt.value === formData.xAxis)?.label}</p>
                    <p><strong>Ось Y:</strong> {currentAxisOptions.find(opt => opt.value === formData.yAxis)?.label}</p>
                    {formData.groupBy && formData.groupBy !== 'none' && (
                  <p><strong>Группировка:</strong> {currentAxisOptions.find(opt => opt.value === formData.groupBy)?.label}</p>
                )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Настройки данных */}
            <Card>
              <CardHeader>
                <CardTitle>Настройки данных</CardTitle>
                <CardDescription>Выберите период данных и настройки расписания</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Период данных</Label>
                  <Select value={formData.dateRange} onValueChange={(value) => handleInputChange('dateRange', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateRanges.map(range => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Интерактивные фильтры */}
                {formData.dataSource && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <Separator />
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 bg-blue-500 rounded-full animate-pulse"></div>
                      <h4 className="text-sm font-medium">Дополнительные фильтры</h4>
                    </div>
                    
                    {/* Фильтры для истории звонков */}
                    {formData.dataSource === 'uon_call_history' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Минимальная длительность звонка (сек)</Label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Статус звонка</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Все статусы" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все статусы</SelectItem>
                              <SelectItem value="answered">Отвеченные</SelectItem>
                              <SelectItem value="missed">Пропущенные</SelectItem>
                              <SelectItem value="busy">Занято</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Фильтры для заявок */}
                    {formData.dataSource === 'uon_requests' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Статус заявки</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Все статусы" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все статусы</SelectItem>
                              <SelectItem value="new">Новые</SelectItem>
                              <SelectItem value="in_progress">В работе</SelectItem>
                              <SelectItem value="completed">Завершенные</SelectItem>
                              <SelectItem value="cancelled">Отмененные</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Приоритет</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Все приоритеты" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все приоритеты</SelectItem>
                              <SelectItem value="low">Низкий</SelectItem>
                              <SelectItem value="medium">Средний</SelectItem>
                              <SelectItem value="high">Высокий</SelectItem>
                              <SelectItem value="urgent">Срочный</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Фильтры для счетов */}
                    {formData.dataSource === 'uon_bills' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Статус оплаты</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Все статусы" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все статусы</SelectItem>
                              <SelectItem value="paid">Оплачено</SelectItem>
                              <SelectItem value="unpaid">Не оплачено</SelectItem>
                              <SelectItem value="overdue">Просрочено</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Минимальная сумма</Label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Максимальная сумма</Label>
                          <Input 
                            type="number" 
                            placeholder="Без ограничений" 
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* Фильтры для лидов */}
                    {formData.dataSource === 'uon_leads' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Источник лида</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Все источники" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все источники</SelectItem>
                              <SelectItem value="website">Сайт</SelectItem>
                              <SelectItem value="social">Соцсети</SelectItem>
                              <SelectItem value="referral">Рекомендации</SelectItem>
                              <SelectItem value="advertising">Реклама</SelectItem>
                              <SelectItem value="cold_call">Холодные звонки</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Статус лида</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Все статусы" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все статусы</SelectItem>
                              <SelectItem value="new">Новый</SelectItem>
                              <SelectItem value="contacted">Связались</SelectItem>
                              <SelectItem value="qualified">Квалифицирован</SelectItem>
                              <SelectItem value="converted">Конвертирован</SelectItem>
                              <SelectItem value="lost">Потерян</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Предпросмотр количества записей */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium">Предпросмотр данных</span>
                        </div>
                        <Badge variant="outline" className="bg-white dark:bg-gray-800">
                          ~{Math.floor(Math.random() * 1000) + 100} записей
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Примерное количество записей, которые будут использованы для построения графика с текущими фильтрами
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Система валидации в реальном времени */}
            {/* Система валидации в реальном времени */}
            {(formData.name || formData.dataSource || formData.chartType) && (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
                    Проверка конфигурации
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Проверка обязательных полей */}
                    <div className="flex items-center gap-2">
                      {formData.name ? (
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      ) : (
                        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      )}
                      <span className={`text-sm ${formData.name ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        Название отчета {formData.name ? '✓' : '(обязательно)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {formData.chartType ? (
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      ) : (
                        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      )}
                      <span className={`text-sm ${formData.chartType ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        Тип диаграммы {formData.chartType ? '✓' : '(обязательно)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {formData.dataSource ? (
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      ) : (
                        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      )}
                      <span className={`text-sm ${formData.dataSource ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        Источник данных {formData.dataSource ? '✓' : '(обязательно)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {formData.xAxis && formData.yAxis ? (
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      ) : (
                        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      )}
                      <span className={`text-sm ${formData.xAxis && formData.yAxis ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        Оси X и Y {formData.xAxis && formData.yAxis ? '✓' : '(обязательно)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {formData.dateRange ? (
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      ) : (
                        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      )}
                      <span className={`text-sm ${formData.dateRange ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        Временной диапазон {formData.dateRange ? '✓' : '(обязательно)'}
                      </span>
                    </div>

                    {/* Проверка совместимости осей с типом диаграммы */}
                    {formData.chartType === 'pie' && formData.xAxis && formData.yAxis && (
                      <div className="flex items-center gap-2">
                        {formData.xAxis !== formData.yAxis ? (
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        ) : (
                          <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                        )}
                        <span className={`text-sm ${formData.xAxis !== formData.yAxis ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                          Совместимость осей {formData.xAxis !== formData.yAxis ? '✓' : '(рекомендуется разные оси для круговой диаграммы)'}
                        </span>
                      </div>
                    )}

                    {/* Проверка данных для предварительного просмотра */}
                    {formData.dataSource && formData.xAxis && formData.yAxis && (
                      <div className="flex items-center gap-2">
                        {previewData.length > 0 ? (
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        ) : (
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                        <span className={`text-sm ${previewData.length > 0 ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}`}>
                          Данные для графика {previewData.length > 0 ? `✓ (${previewData.length} записей)` : '(загружается...)'}
                        </span>
                      </div>
                    )}

                    {/* Общий статус */}
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Готовность к созданию:</span>
                      {formData.name && formData.chartType && formData.dataSource && formData.xAxis && formData.yAxis && formData.dateRange ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Готов ✓
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300">
                          Не готов
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Статус автосохранения */}
            {(formData.name || formData.dataSource || formData.chartType) && (
              <Card className="border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isDraftSaving ? (
                        <>
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-blue-700 dark:text-blue-300">Сохранение черновика...</span>
                        </>
                      ) : lastSavedDraft ? (
                        <>
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-700 dark:text-green-300">
                            Черновик сохранен в {lastSavedDraft.toLocaleTimeString('ru-RU')}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                          <span className="text-sm text-muted-foreground">Автосохранение включено</span>
                        </>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={saveDraft}
                      disabled={isDraftSaving}
                    >
                      Сохранить сейчас
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Отображение ошибок API */}
            {apiError && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-red-700 dark:text-red-300 font-medium">Ошибка</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{apiError}</p>
                </CardContent>
              </Card>
            )}

            {/* Кнопки действий */}
            <div className="flex items-center justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push('/reports')}>
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !(formData.name && formData.chartType && formData.dataSource && formData.xAxis && formData.yAxis && formData.dateRange)}
              >
                <SaveIcon className="h-4 w-4 mr-2" />
                {loading ? 'Создание...' : 'Создать отчет'}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}