'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Users, 
  FileText, 
  BarChart3, 
  TrendingUp,
  Calendar,
  Share2,
  RefreshCw,
  Crown,
  Building2,
  PieChart,
  Activity
} from 'lucide-react';
import EChartsWrapper from '@/components/charts/echarts-wrapper';

interface ReportAnalytics {
  overview: {
    totalReports: number;
    totalUsers: number;
    totalTeams: number;
    totalShares: number;
    scheduledReports: number;
    avgReportsPerUser: number;
  };
  topUsers: Array<{
    userId: number;
    userName: string;
    userEmail: string;
    reportCount: number;
    shareCount: number;
  }>;
  teamStats: Array<{
    teamId: number;
    teamName: string;
    reportCount: number;
    userCount: number;
    avgReportsPerUser: number;
  }>;
  reportTypes: Array<{
    chartType: string;
    count: number;
    percentage: number;
  }>;
  dataSources: Array<{
    dataSource: string;
    count: number;
    percentage: number;
  }>;
  scheduleStats: {
    daily: number;
    weekly: number;
    monthly: number;
    unscheduled: number;
  };
  shareStats: {
    totalShares: number;
    avgSharesPerReport: number;
    mostSharedReports: Array<{
      reportId: number;
      reportName: string;
      shareCount: number;
      createdBy: string;
    }>;
  };
  monthlyActivity: Array<{
    month: string;
    reportsCreated: number;
    reportsShared: number;
  }>;
}

export default function ReportsAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ReportAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/analytics/reports');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Ошибка при загрузке аналитики:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
        <span className="ml-2">Загрузка аналитики отчетов...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Аналитика отчетов</h1>
          <p className="text-muted-foreground mt-2">
            Статистика использования отчетов пользователями
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p className="font-medium">Ошибка загрузки данных</p>
              <p className="text-sm mt-1">{error}</p>
              <Button 
                onClick={fetchAnalytics} 
                className="mt-4"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Повторить попытку
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Аналитика отчетов</h1>
          <p className="text-muted-foreground mt-2">
            Нет данных для отображения
          </p>
        </div>
      </div>
    );
  }

  // Подготовка данных для графиков
  const reportTypesChartData = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: 'Типы отчетов',
        type: 'pie',
        radius: '50%',
        data: analytics.reportTypes.map(item => ({
          value: item.count,
          name: item.chartType
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  const dataSourcesChartData = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: 'Источники данных',
        type: 'pie',
        radius: '50%',
        data: analytics.dataSources.map(item => ({
          value: item.count,
          name: item.dataSource
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  const monthlyActivityChartData = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['Создано отчетов', 'Поделились отчетами']
    },
    xAxis: {
      type: 'category',
      data: analytics.monthlyActivity.map(item => item.month)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Создано отчетов',
        type: 'bar',
        data: analytics.monthlyActivity.map(item => item.reportsCreated),
        itemStyle: {
          color: '#3b82f6'
        }
      },
      {
        name: 'Поделились отчетами',
        type: 'line',
        data: analytics.monthlyActivity.map(item => item.reportsShared),
        itemStyle: {
          color: '#10b981'
        }
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Аналитика отчетов</h1>
          <p className="text-muted-foreground mt-2">
            Статистика использования отчетов пользователями
          </p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Общая статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего отчетов</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              Среднее на пользователя: {analytics.overview.avgReportsPerUser.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных пользователей</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Создавших отчеты
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Команд с отчетами</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalTeams}</div>
            <p className="text-xs text-muted-foreground">
              Активных команд
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего поделились</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalShares}</div>
            <p className="text-xs text-muted-foreground">
              Среднее на отчет: {analytics.shareStats.avgSharesPerReport.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Запланированных</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.scheduledReports}</div>
            <p className="text-xs text-muted-foreground">
              Автоматических отчетов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активность</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((analytics.overview.scheduledReports / analytics.overview.totalReports) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Автоматизированных отчетов
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Топ пользователи */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="h-5 w-5 mr-2" />
            Топ пользователи по отчетам
          </CardTitle>
          <CardDescription>
            Пользователи с наибольшим количеством созданных отчетов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topUsers.map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant={index < 3 ? "default" : "secondary"}>
                    #{index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{user.userName || user.userEmail}</p>
                    <p className="text-sm text-muted-foreground">{user.userEmail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{user.reportCount} отчетов</p>
                  <p className="text-sm text-muted-foreground">{user.shareCount} поделились</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Статистика по командам */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Статистика по командам
          </CardTitle>
          <CardDescription>
            Активность команд в создании отчетов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.teamStats.map((team) => (
              <div key={team.teamId} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{team.teamName}</p>
                  <p className="text-sm text-muted-foreground">{team.userCount} пользователей</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{team.reportCount} отчетов</p>
                  <p className="text-sm text-muted-foreground">
                    {team.avgReportsPerUser.toFixed(1)} на пользователя
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Графики */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Типы отчетов
            </CardTitle>
            <CardDescription>
              Распределение по типам графиков
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EChartsWrapper option={reportTypesChartData} style={{ height: '300px', width: '100%' }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Источники данных
            </CardTitle>
            <CardDescription>
              Распределение по источникам данных
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EChartsWrapper option={dataSourcesChartData} style={{ height: '300px', width: '100%' }} />
          </CardContent>
        </Card>
      </div>

      {/* Расписание отчетов */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Расписание отчетов
          </CardTitle>
          <CardDescription>
            Распределение по частоте генерации
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{analytics.scheduleStats.daily}</p>
              <p className="text-sm text-muted-foreground">Ежедневно</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-green-600">{analytics.scheduleStats.weekly}</p>
              <p className="text-sm text-muted-foreground">Еженедельно</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{analytics.scheduleStats.monthly}</p>
              <p className="text-sm text-muted-foreground">Ежемесячно</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-gray-600">{analytics.scheduleStats.unscheduled}</p>
              <p className="text-sm text-muted-foreground">Без расписания</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Самые популярные отчеты */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Самые популярные отчеты
          </CardTitle>
          <CardDescription>
            Отчеты, которыми чаще всего делятся
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.shareStats.mostSharedReports.map((report, index) => (
              <div key={report.reportId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant={index < 3 ? "default" : "secondary"}>
                    #{index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{report.reportName}</p>
                    <p className="text-sm text-muted-foreground">Создал: {report.createdBy}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{report.shareCount} раз</p>
                  <p className="text-sm text-muted-foreground">поделились</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Месячная активность */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Месячная активность
          </CardTitle>
          <CardDescription>
            Динамика создания и распространения отчетов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EChartsWrapper option={monthlyActivityChartData} style={{ height: '400px', width: '100%' }} />
        </CardContent>
      </Card>
    </div>
  );
}