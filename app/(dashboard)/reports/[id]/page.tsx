'use client'

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, EditIcon, ShareIcon, DownloadIcon, RefreshCwIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import dynamic from 'next/dynamic';

import { generateChartOptions, ChartConfig } from '@/lib/chart-utils'

// Динамический импорт ECharts для избежания SSR проблем
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface Report {
  id: number;
  name: string;
  description?: string;
  chartType: string;
  dataSource: string;
  config: string;
  filters?: string;
  dateRange?: string;
  customDateFrom?: string;
  customDateTo?: string;
  isScheduled: boolean;
  scheduleFrequency?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChartData {
  xAxis?: any;
  yAxis?: any;
  series: any[];
}

interface ReportData {
  data: ChartData;
  config: any;
  dateRange: {
    from: string;
    to: string;
  };
}

const chartTypeLabels: Record<string, string> = {
  bar: 'Столбчатая диаграмма',
  line: 'Линейный график',
  pie: 'Круговая диаграмма',
  scatter: 'Точечная диаграмма',
};

const dataSourceLabels: Record<string, string> = {
  uon_call_history: 'История звонков',
  uon_requests: 'Заявки',
  uon_bills: 'Счета',
  uon_clients: 'Клиенты',
  uon_leads: 'Лиды',
  uon_managers: 'Менеджеры',
};

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  useEffect(() => {
    if (report) {
      fetchReportData();
    }
  }, [report]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/${reportId}`);
      if (!response.ok) {
        throw new Error('Не удалось загрузить отчет');
      }
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    try {
      setDataLoading(true);
      const response = await fetch(`/api/reports/${reportId}/data`);
      if (!response.ok) {
        throw new Error('Не удалось загрузить данные отчета');
      }
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке данных');
    } finally {
      setDataLoading(false);
    }
  };

  // Генерация опций графика на основе данных и конфигурации
  const chartOptions = useMemo(() => {
    if (!reportData || !report) return {}
    
    // Парсим конфигурацию из JSON
    let parsedConfig: any = {}
    try {
      parsedConfig = JSON.parse(report.config)
    } catch (error) {
      console.error('Error parsing report config:', error)
      return {}
    }
    
    const config: ChartConfig = {
      chartType: report.chartType,
      xAxis: parsedConfig.xAxis || 'date',
      yAxis: parsedConfig.yAxis || 'value',
      groupBy: parsedConfig.groupBy || undefined,
      title: report.name,
      description: report.description || undefined
    }
    
    // Преобразуем данные в нужный формат
    const chartData = Array.isArray(reportData.data) ? reportData.data : [reportData.data]
    
    return generateChartOptions(chartData, config)
  }, [reportData, report])

  // Функция для получения опций графика (удалена, заменена на useMemo выше)

  const handleEdit = () => {
    router.push(`/reports/${reportId}/edit`);
  };

  const handleRefresh = () => {
    fetchReportData();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Загрузка отчета...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error || 'Отчет не найден'}</p>
              <Button onClick={() => router.push('/reports')}>
                Вернуться к отчетам
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = JSON.parse(report.config);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Заголовок отчета */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{report.name}</h1>
          {report.description && (
            <p className="text-muted-foreground mt-2">{report.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={dataLoading}>
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button variant="outline" size="sm">
            <ShareIcon className="h-4 w-4 mr-2" />
            Поделиться
          </Button>
          <Button variant="outline" size="sm">
            <DownloadIcon className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button size="sm" onClick={handleEdit}>
            <EditIcon className="h-4 w-4 mr-2" />
            Редактировать
          </Button>
        </div>
      </div>

      {/* Информация об отчете */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Информация об отчете</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Тип диаграммы</p>
              <Badge variant="secondary">
                {chartTypeLabels[report.chartType] || report.chartType}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Источник данных</p>
              <Badge variant="outline">
                {dataSourceLabels[config.dataSource] || config.dataSource}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Создан</p>
              <p className="text-sm">
                {format(new Date(report.createdAt), 'dd MMMM yyyy', { locale: ru })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Обновлен</p>
              <p className="text-sm">
                {format(new Date(report.updatedAt), 'dd MMMM yyyy', { locale: ru })}
              </p>
            </div>
          </div>
          
          {reportData && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  Данные за период: {format(new Date(reportData.dateRange.from), 'dd.MM.yyyy', { locale: ru })} - {format(new Date(reportData.dateRange.to), 'dd.MM.yyyy', { locale: ru })}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* График */}
      <Card>
        <CardHeader>
          <CardTitle>Визуализация данных</CardTitle>
          {dataLoading && (
            <CardDescription>Загрузка данных...</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="flex items-center justify-center h-96">
              <RefreshCwIcon className="h-8 w-8 animate-spin" />
            </div>
          ) : reportData ? (
            <div className="h-96">
              <ReactECharts
                  option={chartOptions}
                  style={{ height: '400px', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Нет данных для отображения</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}