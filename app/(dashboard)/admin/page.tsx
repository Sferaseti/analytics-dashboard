'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/admin/stats-card';
import { OverviewChart } from '@/components/admin/overview-chart';
import { RecentActivity } from '@/components/admin/recent-activity';
import { Users, Activity, Database, Shield, TrendingUp, UserPlus } from 'lucide-react';

interface Analytics {
  overview: {
    totalUsers: number;
    totalTeams: number;
    recentUsers: number;
    totalActivity: number;
    growthRate: number;
  };
  usersByRole: Array<{
    role: string;
    count: number;
    percentage: number;
  }>;
  monthlyRegistrations: Array<{
    month: string;
    registrations: number;
  }>;
  trends: {
    usersGrowth: string;
    teamsGrowth: string;
    activityGrowth: string;
  };
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Панель администратора</h1>
        <p className="text-muted-foreground">
          Обзор системы и ключевые метрики
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Всего пользователей"
          value={analytics?.overview.totalUsers.toString() || '0'}
          description={`+${analytics?.overview.recentUsers || 0} за последний месяц`}
          icon={Users}
          trend={analytics?.trends.usersGrowth}
        />
        <StatsCard
          title="Команды"
          value={analytics?.overview.totalTeams.toString() || '0'}
          description="Активные команды"
          icon={Shield}
          trend={analytics?.trends.teamsGrowth}
        />
        <StatsCard
          title="Активность"
          value={analytics?.overview.totalActivity.toString() || '0'}
          description="Всего действий"
          icon={Activity}
          trend={analytics?.trends.activityGrowth}
        />
        <StatsCard
          title="Рост"
          value={`${analytics?.overview.growthRate || 0}%`}
          description="Новые пользователи"
          icon={TrendingUp}
          trend={analytics?.trends.usersGrowth}
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Обзор активности</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart data={analytics?.monthlyRegistrations || []} />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Последняя активность</CardTitle>
            <CardDescription>
              Недавние действия пользователей
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>

      {/* Additional Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Новые регистрации
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.recentUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              За последние 30 дней
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              База данных
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((analytics?.overview.totalUsers || 0) * 1.2).toFixed(1)}MB
            </div>
            <p className="text-xs text-muted-foreground">
              Размер базы данных
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Распределение ролей
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics?.usersByRole.map((role) => (
                <div key={role.role} className="flex justify-between text-sm">
                  <span className="capitalize">{role.role}</span>
                  <span>{role.count} ({role.percentage}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}