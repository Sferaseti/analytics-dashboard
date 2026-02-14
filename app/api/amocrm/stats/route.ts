import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import { getUserWithTeam } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { amoCrmSettings, amoCrmEntityMapping, amoCrmSyncLog } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

// GET - получить статистику синхронизации
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload.user?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(payload.user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Получаем настройки
    const [settings] = await db
      .select()
      .from(amoCrmSettings)
      .where(eq(amoCrmSettings.teamId, userWithTeam.teamId))
      .limit(1);

    // Получаем маппинги с группировкой по типам
    const mappings = await db
      .select({
        uonEntityType: amoCrmEntityMapping.uonEntityType,
        amoEntityType: amoCrmEntityMapping.amoEntityType,
        count: sql<number>`count(*)::int`,
      })
      .from(amoCrmEntityMapping)
      .where(eq(amoCrmEntityMapping.teamId, userWithTeam.teamId))
      .groupBy(amoCrmEntityMapping.uonEntityType, amoCrmEntityMapping.amoEntityType);

    // Получаем последние логи синхронизации
    const logs = await db
      .select()
      .from(amoCrmSyncLog)
      .where(eq(amoCrmSyncLog.teamId, userWithTeam.teamId))
      .orderBy(desc(amoCrmSyncLog.startedAt))
      .limit(20);

    // Считаем общую статистику
    const totalMappings = mappings.reduce((sum, m) => sum + m.count, 0);

    const mappingsByType: Record<string, number> = {};
    for (const mapping of mappings) {
      const key = `${mapping.uonEntityType} -> ${mapping.amoEntityType}`;
      mappingsByType[key] = mapping.count;
    }

    // Статистика по последним синхронизациям
    const syncStats = {
      total: logs.length,
      successful: logs.filter((l) => l.status === 'completed').length,
      failed: logs.filter((l) => l.status === 'failed').length,
      lastSuccessful: logs.find((l) => l.status === 'completed'),
      lastFailed: logs.find((l) => l.status === 'failed'),
    };

    return NextResponse.json({
      success: true,
      stats: {
        lastSyncAt: settings?.lastSyncAt || null,
        isActive: settings?.isActive || false,
        syncEnabled: settings?.syncEnabled || false,
        syncInterval: settings?.syncInterval || 30,
        totalMappings,
        mappingsByType,
        syncStats,
        recentLogs: logs.map((log) => ({
          id: log.id,
          entityType: log.entityType,
          direction: log.direction,
          status: log.status,
          recordsProcessed: log.recordsProcessed,
          recordsCreated: log.recordsCreated,
          recordsUpdated: log.recordsUpdated,
          recordsSkipped: log.recordsSkipped,
          recordsFailed: log.recordsFailed,
          errorMessage: log.errorMessage,
          startedAt: log.startedAt,
          completedAt: log.completedAt,
          duration: log.duration,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting sync stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
