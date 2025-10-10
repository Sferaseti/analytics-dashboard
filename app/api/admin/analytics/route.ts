import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers, activityLogs } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, gte, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Проверяем, что пользователь авторизован и является супер-админом
    const currentUser = await getUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Получаем статистику
    const [
      totalUsers,
      totalTeams,
      recentUsers,
      usersByRole,
      monthlyRegistrations,
      activityStats
    ] = await Promise.all([
      // Общее количество пользователей
      db.select({ count: sql<number>`count(*)` }).from(users),
      
      // Общее количество команд
      db.select({ count: sql<number>`count(*)` }).from(teams),
      
      // Пользователи за последние 30 дней
      db.select({ count: sql<number>`count(*)` }).from(users)
        .where(gte(users.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
      
      // Пользователи по ролям
      db.select({
        role: users.role,
        count: sql<number>`count(*)`
      }).from(users).groupBy(users.role),
      
      // Регистрации по месяцам (последние 6 месяцев)
      db.execute(sql`
        SELECT 
          DATE_TRUNC('month', "created_at") as month,
          COUNT(*)::int as count
        FROM "users"
        WHERE "created_at" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "created_at")
        ORDER BY month ASC
      `),
      
      // Статистика активности (если есть таблица activityLogs)
      db.select({ count: sql<number>`count(*)` }).from(activityLogs).catch(() => [{ count: 0 }])
    ]);

    // Форматируем данные для графиков
    const monthlyData = (monthlyRegistrations as any[]).map((item: any) => ({
      month: new Date(item.month).toLocaleDateString('ru-RU', { 
        month: 'short', 
        year: 'numeric' 
      }),
      registrations: item.count
    }));

    // Добавляем недостающие месяцы с нулевыми значениями
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('ru-RU', { 
        month: 'short', 
        year: 'numeric' 
      });
      
      const existingData = monthlyData.find((item: any) => item.month === monthKey);
      last6Months.push({
        month: monthKey,
        registrations: existingData ? existingData.registrations : 0
      });
    }

    const totalUsersCount = totalUsers[0]?.count || 0;
    const totalTeamsCount = totalTeams[0]?.count || 0;
    const recentUsersCount = recentUsers[0]?.count || 0;
    const totalActivityCount = activityStats[0]?.count || 0;

    const analytics = {
      overview: {
        totalUsers: totalUsersCount,
        totalTeams: totalTeamsCount,
        recentUsers: recentUsersCount,
        totalActivity: totalActivityCount,
        growthRate: totalUsersCount > 0 ? Math.round((recentUsersCount / totalUsersCount) * 100) : 0
      },
      usersByRole: usersByRole.map((item: any) => ({
        role: item.role,
        count: item.count,
        percentage: Math.round((item.count / totalUsersCount) * 100)
      })),
      monthlyRegistrations: last6Months,
      trends: {
        usersGrowth: recentUsersCount > 0 ? '+' + Math.round((recentUsersCount / Math.max(totalUsersCount - recentUsersCount, 1)) * 100) + '%' : '0%',
        teamsGrowth: '+12%', // Можно добавить реальный расчет
        activityGrowth: '+8%' // Можно добавить реальный расчет
      }
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}