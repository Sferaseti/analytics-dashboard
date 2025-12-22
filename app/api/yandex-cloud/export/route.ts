import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import { getUserWithTeam } from '@/lib/db/queries';
import { getTeamYandexCloudSettings } from '@/lib/db/queries/teams';
import { createYandexCloudSyncService } from '@/lib/services/yandex-cloud-sync';
import { db } from '@/lib/db/drizzle';
import { yandexCloudSyncLog } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// POST - экспорт данных в Yandex Cloud
export async function POST(request: NextRequest) {
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

    const settings = await getTeamYandexCloudSettings(userWithTeam.teamId);

    if (!settings?.accessKeyId || !settings?.secretAccessKey || !settings?.bucket) {
      return NextResponse.json(
        { error: 'Yandex Cloud настройки не найдены. Сначала настройте интеграцию.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { entities, format = 'json' } = body;

    // Определяем, какие сущности экспортировать
    const entitiesToExport = entities || [
      'tourists',
      'requests',
      'bills',
      'clients',
      'leads',
      'managers',
      'call_history',
    ];

    console.log(`[YC Export] Начало экспорта для команды ${userWithTeam.teamId}`);
    console.log(`[YC Export] Сущности: ${entitiesToExport.join(', ')}`);
    console.log(`[YC Export] Формат: ${format}`);

    const startTime = Date.now();

    // Записываем начало экспорта в лог
    const [logEntry] = await db
      .insert(yandexCloudSyncLog)
      .values({
        teamId: userWithTeam.teamId,
        operationType: format === 'csv' ? 'datalens_export' : 'export',
        status: 'in_progress',
        startedAt: new Date(),
      })
      .returning();

    // Создаем сервис синхронизации
    const syncService = createYandexCloudSyncService(userWithTeam.teamId, {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
      bucket: settings.bucket,
      region: 'ru-central1',
    });

    let result;

    if (format === 'csv') {
      // Экспорт в CSV для DataLens
      result = await syncService.exportForDataLens();
    } else {
      // Экспорт в JSON
      result = await syncService.exportAll();
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Обновляем запись в логе
    if (result.success && result.data) {
      const totalRecords = result.data.reduce((sum, e) => sum + e.recordsExported, 0);
      const totalSize = result.data.reduce((sum, e) => sum + e.fileSize, 0);

      await db
        .update(yandexCloudSyncLog)
        .set({
          status: 'success',
          recordsExported: totalRecords,
          fileSize: totalSize,
          completedAt: new Date(),
          duration,
        })
        .where(eq(yandexCloudSyncLog.id, logEntry.id));

      return NextResponse.json({
        success: true,
        message: `Экспорт завершен успешно`,
        data: {
          entities: result.data,
          totalRecords,
          totalSize,
          format,
          duration,
        },
      });
    } else {
      await db
        .update(yandexCloudSyncLog)
        .set({
          status: 'error',
          errorMessage: result.error,
          completedAt: new Date(),
          duration,
        })
        .where(eq(yandexCloudSyncLog.id, logEntry.id));

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Ошибка экспорта',
          data: result.data,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error exporting to Yandex Cloud:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - получить статус последнего экспорта
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

    // Получаем последние экспорты
    const recentExports = await db
      .select()
      .from(yandexCloudSyncLog)
      .where(eq(yandexCloudSyncLog.teamId, userWithTeam.teamId))
      .orderBy(desc(yandexCloudSyncLog.startedAt))
      .limit(10);

    return NextResponse.json({
      success: true,
      exports: recentExports.map((e) => ({
        id: e.id,
        operationType: e.operationType,
        entityType: e.entityType,
        status: e.status,
        recordsExported: e.recordsExported,
        fileKey: e.fileKey,
        fileSize: e.fileSize,
        errorMessage: e.errorMessage,
        startedAt: e.startedAt?.toISOString(),
        completedAt: e.completedAt?.toISOString(),
        duration: e.duration,
      })),
    });
  } catch (error) {
    console.error('Error getting export status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
