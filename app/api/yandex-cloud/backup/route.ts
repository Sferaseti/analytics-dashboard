import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import { getUserWithTeam } from '@/lib/db/queries';
import { getTeamYandexCloudSettings, updateTeamLastBackup } from '@/lib/db/queries/teams';
import { createYandexCloudSyncService } from '@/lib/services/yandex-cloud-sync';
import { db } from '@/lib/db/drizzle';
import { yandexCloudSyncLog } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// POST - создать бэкап данных в Yandex Cloud
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

    console.log(`[YC Backup] Создание бэкапа для команды ${userWithTeam.teamId}`);

    const startTime = Date.now();
    const backupId = `backup-${Date.now()}`;

    // Записываем начало бэкапа в лог
    const [logEntry] = await db
      .insert(yandexCloudSyncLog)
      .values({
        teamId: userWithTeam.teamId,
        operationType: 'backup',
        status: 'in_progress',
        backupId,
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

    // Создаем бэкап
    const result = await syncService.createBackup();

    const duration = Math.floor((Date.now() - startTime) / 1000);

    if (result.success && result.data) {
      // Обновляем запись в логе
      await db
        .update(yandexCloudSyncLog)
        .set({
          status: 'success',
          recordsExported: result.data.totalRecords,
          fileSize: result.data.totalSize,
          completedAt: new Date(),
          duration,
        })
        .where(eq(yandexCloudSyncLog.id, logEntry.id));

      // Обновляем время последнего бэкапа
      await updateTeamLastBackup(userWithTeam.teamId);

      return NextResponse.json({
        success: true,
        message: 'Бэкап создан успешно',
        backup: {
          id: result.data.backupId,
          entities: result.data.entities,
          totalRecords: result.data.totalRecords,
          totalSize: result.data.totalSize,
          createdAt: result.data.createdAt,
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
          error: result.error || 'Ошибка создания бэкапа',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - получить список бэкапов
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

    const settings = await getTeamYandexCloudSettings(userWithTeam.teamId);

    if (!settings?.accessKeyId || !settings?.secretAccessKey || !settings?.bucket) {
      return NextResponse.json(
        { error: 'Yandex Cloud настройки не найдены' },
        { status: 400 }
      );
    }

    // Получаем список бэкапов из Object Storage
    const syncService = createYandexCloudSyncService(userWithTeam.teamId, {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
      bucket: settings.bucket,
      region: 'ru-central1',
    });

    const backupsResult = await syncService.listBackups();

    // Также получаем историю из базы данных
    const backupLogs = await db
      .select()
      .from(yandexCloudSyncLog)
      .where(eq(yandexCloudSyncLog.teamId, userWithTeam.teamId))
      .orderBy(desc(yandexCloudSyncLog.startedAt))
      .limit(20);

    return NextResponse.json({
      success: true,
      backups: backupsResult.success ? backupsResult.data : [],
      history: backupLogs
        .filter((log) => log.operationType === 'backup')
        .map((log) => ({
          id: log.id,
          backupId: log.backupId,
          status: log.status,
          recordsExported: log.recordsExported,
          fileSize: log.fileSize,
          errorMessage: log.errorMessage,
          startedAt: log.startedAt?.toISOString(),
          completedAt: log.completedAt?.toISOString(),
          duration: log.duration,
        })),
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
