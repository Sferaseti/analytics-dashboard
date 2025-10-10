'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, BarChart3, LineChart, PieChart, TrendingUp, Calendar, Share2, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Report {
  id: number;
  name: string;
  description?: string;
  chartType: string;
  dataSource: string;
  dateRange?: string;
  isScheduled: boolean;
  scheduleFrequency?: string;
  lastGenerated?: string;
  createdAt: string;
  updatedAt: string;
}

const chartTypeIcons = {
  line: LineChart,
  bar: BarChart3,
  pie: PieChart,
  scatter: TrendingUp,
};

const chartTypeLabels = {
  line: 'Линейный график',
  bar: 'Столбчатая диаграмма',
  pie: 'Круговая диаграмма',
  scatter: 'Точечная диаграмма',
};

const dataSourceLabels = {
  uon_call_history: 'История звонков',
  uon_requests: 'Заявки',
  uon_bills: 'Счета',
  uon_clients: 'Клиенты',
  uon_leads: 'Лиды',
  uon_managers: 'Менеджеры',
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      if (response.ok) {
        const data = await response.json();
        // API возвращает объект с полями reports и templates
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки отчетов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот отчет?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReports(reports.filter(report => report.id !== reportId));
      }
    } catch (error) {
      console.error('Ошибка удаления отчета:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Загрузка отчетов...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Отчеты</h1>
          <p className="text-muted-foreground mt-2">
            Создавайте и управляйте динамическими отчетами на основе ваших данных
          </p>
        </div>
        <Link href="/reports/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Создать отчет
          </Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Нет отчетов</h3>
            <p className="text-muted-foreground text-center mb-6">
              Создайте свой первый отчет, чтобы начать анализ данных
            </p>
            <Link href="/reports/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Создать первый отчет
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const ChartIcon = chartTypeIcons[report.chartType as keyof typeof chartTypeIcons] || BarChart3;
            
            return (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <ChartIcon className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Link href={`/reports/${report.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {report.description && (
                    <CardDescription>{report.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Тип графика:</span>
                      <Badge variant="secondary">
                        {chartTypeLabels[report.chartType as keyof typeof chartTypeLabels] || report.chartType}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Источник данных:</span>
                      <Badge variant="outline">
                        {dataSourceLabels[report.dataSource as keyof typeof dataSourceLabels] || report.dataSource}
                      </Badge>
                    </div>

                    {report.dateRange && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Период:</span>
                        <span className="text-sm">{report.dateRange}</span>
                      </div>
                    )}

                    {report.isScheduled && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Автообновление: {report.scheduleFrequency}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Создан:</span>
                      <span>
                        {formatDistanceToNow(new Date(report.createdAt), { 
                          addSuffix: true, 
                          locale: ru 
                        })}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Link href={`/reports/${report.id}`} className="flex-1">
                        <Button variant="default" className="w-full">
                          Открыть отчет
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}