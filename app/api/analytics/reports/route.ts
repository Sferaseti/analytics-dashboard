import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { reports, users, teams, teamMembers, reportShares } from '@/lib/db/schema';
import { eq, sql, desc, count, avg, sum } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем роль пользователя - только админы могут видеть общую аналитику
    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Получаем общую статистику по отчетам
    const reportStats = await db
      .select({
        totalReports: count(reports.id),
        totalUsers: sql<number>`COUNT(DISTINCT ${reports.createdBy})`,
        totalTeams: sql<number>`COUNT(DISTINCT ${reports.teamId})`,
        avgReportsPerUser: sql<number>`ROUND(COUNT(${reports.id})::numeric / COUNT(DISTINCT ${reports.createdBy}), 2)`,
      })
      .from(reports);

    // Получаем топ пользователей по количеству отчетов
    const topUsersByReports = await db
      .select({
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        teamName: teams.name,
        reportsCount: count(reports.id),
        lastReportCreated: sql<string>`MAX(${reports.createdAt})`,
      })
      .from(reports)
      .innerJoin(users, eq(reports.createdBy, users.id))
      .innerJoin(teams, eq(reports.teamId, teams.id))
      .groupBy(users.id, users.name, users.email, teams.name)
      .orderBy(desc(count(reports.id)))
      .limit(20);

    // Получаем статистику по командам
    const teamStats = await db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        reportsCount: count(reports.id),
        usersCount: sql<number>`COUNT(DISTINCT ${reports.createdBy})`,
        avgReportsPerUser: sql<number>`ROUND(COUNT(${reports.id})::numeric / COUNT(DISTINCT ${reports.createdBy}), 2)`,
        lastActivity: sql<string>`MAX(${reports.createdAt})`,
      })
      .from(teams)
      .leftJoin(reports, eq(teams.id, reports.teamId))
      .groupBy(teams.id, teams.name)
      .orderBy(desc(count(reports.id)));

    // Получаем статистику по типам отчетов
    const chartTypeStats = await db
      .select({
        chartType: reports.chartType,
        count: count(reports.id),
        percentage: sql<number>`ROUND((COUNT(${reports.id}) * 100.0 / (SELECT COUNT(*) FROM ${reports})), 2)`,
      })
      .from(reports)
      .groupBy(reports.chartType)
      .orderBy(desc(count(reports.id)));

    // Получаем статистику по источникам данных
    const dataSourceStats = await db
      .select({
        dataSource: reports.dataSource,
        count: count(reports.id),
        percentage: sql<number>`ROUND((COUNT(${reports.id}) * 100.0 / (SELECT COUNT(*) FROM ${reports})), 2)`,
      })
      .from(reports)
      .groupBy(reports.dataSource)
      .orderBy(desc(count(reports.id)));

    // Получаем статистику по расписанию отчетов
    const scheduledReportsStats = await db
      .select({
        isScheduled: reports.isScheduled,
        count: count(reports.id),
        percentage: sql<number>`ROUND((COUNT(${reports.id}) * 100.0 / (SELECT COUNT(*) FROM ${reports})), 2)`,
      })
      .from(reports)
      .groupBy(reports.isScheduled)
      .orderBy(desc(count(reports.id)));

    // Получаем статистику по расшариванию отчетов
    const shareStats = await db
      .select({
        totalShares: count(reportShares.id),
        uniqueReportsShared: sql<number>`COUNT(DISTINCT ${reportShares.reportId})`,
        avgSharesPerReport: sql<number>`ROUND(COUNT(${reportShares.id})::numeric / COUNT(DISTINCT ${reportShares.reportId}), 2)`,
      })
      .from(reportShares);

    // Получаем топ самых расшариваемых отчетов
    const mostSharedReports = await db
      .select({
        reportId: reports.id,
        reportName: reports.name,
        creatorName: users.name,
        teamName: teams.name,
        sharesCount: count(reportShares.id),
        createdAt: reports.createdAt,
      })
      .from(reports)
      .innerJoin(users, eq(reports.createdBy, users.id))
      .innerJoin(teams, eq(reports.teamId, teams.id))
      .leftJoin(reportShares, eq(reports.id, reportShares.reportId))
      .groupBy(reports.id, reports.name, users.name, teams.name, reports.createdAt)
      .having(sql`COUNT(${reportShares.id}) > 0`)
      .orderBy(desc(count(reportShares.id)))
      .limit(10);

    // Получаем активность по месяцам (последние 12 месяцев)
    const monthlyActivity = await db
      .select({
        month: sql<string>`TO_CHAR(${reports.createdAt}, 'YYYY-MM')`,
        reportsCreated: count(reports.id),
        uniqueUsers: sql<number>`COUNT(DISTINCT ${reports.createdBy})`,
      })
      .from(reports)
      .where(sql`${reports.createdAt} >= NOW() - INTERVAL '12 months'`)
      .groupBy(sql`TO_CHAR(${reports.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${reports.createdAt}, 'YYYY-MM')`);

    return NextResponse.json({
      overview: reportStats[0],
      topUsers: topUsersByReports,
      teamStats,
      chartTypes: chartTypeStats,
      dataSources: dataSourceStats,
      scheduledReports: scheduledReportsStats,
      shareStats: shareStats[0],
      mostSharedReports,
      monthlyActivity,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching reports analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}