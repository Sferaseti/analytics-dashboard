import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { amoCrmSettings, teams } from '@/lib/db/schema';
import { eq, and, lte, or, isNull } from 'drizzle-orm';
import { createConnector } from '@/lib/services/uon-amocrm-connector';
import { getTeamUonApiKey } from '@/lib/db/queries/teams';

// Секретный ключ для защиты cron endpoint
const CRON_SECRET = process.env.CRON_SECRET || 'default-cron-secret';

/**
 * POST /api/amocrm/cron
 * Запускает автоматическую синхронизацию для всех команд
 *
 * Должен вызываться по расписанию (Vercel Cron, GitHub Actions, etc.)
 * Заголовок Authorization: Bearer {CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-cron-secret');

    // Поддерживаем оба варианта авторизации
    const isAuthorized =
      authHeader === `Bearer ${CRON_SECRET}` ||
      cronSecret === CRON_SECRET ||
      // Для Vercel Cron
      request.headers.get('x-vercel-cron') === '1';

    if (!isAuthorized && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 [Cron] Запуск автоматической синхронизации amoCRM');

    // Получаем все активные настройки amoCRM с включенной автосинхронизацией
    const now = new Date();
    const activeSettings = await db
      .select()
      .from(amoCrmSettings)
      .where(
        and(
          eq(amoCrmSettings.isActive, true),
          eq(amoCrmSettings.syncEnabled, true)
        )
      );

    console.log(`📊 [Cron] Найдено ${activeSettings.length} команд для синхронизации`);

    const results: Array<{
      teamId: number;
      success: boolean;
      message: string;
      details?: any;
    }> = [];

    for (const settings of activeSettings) {
      try {
        // Проверяем интервал синхронизации
        const syncIntervalMs = (settings.syncInterval || 30) * 60 * 1000; // в миллисекундах
        const lastSync = settings.lastSyncAt ? new Date(settings.lastSyncAt).getTime() : 0;
        const nextSyncTime = lastSync + syncIntervalMs;

        if (now.getTime() < nextSyncTime) {
          const remainingMinutes = Math.ceil((nextSyncTime - now.getTime()) / 60000);
          console.log(`⏳ [Cron] Команда ${settings.teamId}: следующая синхронизация через ${remainingMinutes} мин`);
          results.push({
            teamId: settings.teamId,
            success: true,
            message: `Пропущено: следующая синхронизация через ${remainingMinutes} мин`,
          });
          continue;
        }

        // Проверяем наличие U-ON API ключа
        const uonApiKey = await getTeamUonApiKey(settings.teamId);
        if (!uonApiKey) {
          console.log(`⚠️ [Cron] Команда ${settings.teamId}: U-ON API ключ не настроен`);
          results.push({
            teamId: settings.teamId,
            success: false,
            message: 'U-ON API ключ не настроен',
          });
          continue;
        }

        // Создаем коннектор
        const connector = await createConnector(settings.teamId);
        if (!connector) {
          console.log(`❌ [Cron] Команда ${settings.teamId}: не удалось создать коннектор`);
          results.push({
            teamId: settings.teamId,
            success: false,
            message: 'Не удалось создать коннектор',
          });
          continue;
        }

        // Инициализируем U-ON клиент
        await connector.initUonClient(uonApiKey);

        // Запускаем синхронизацию
        console.log(`🔄 [Cron] Команда ${settings.teamId}: запуск синхронизации...`);
        const syncResult = await connector.syncAll();

        // Подсчитываем статистику
        const totalProcessed =
          syncResult.tourists.recordsProcessed +
          syncResult.requests.recordsProcessed +
          syncResult.leads.recordsProcessed +
          syncResult.calls.recordsProcessed;

        const totalCreated =
          syncResult.tourists.recordsCreated +
          syncResult.requests.recordsCreated +
          syncResult.leads.recordsCreated +
          syncResult.calls.recordsCreated;

        const totalFailed =
          syncResult.tourists.recordsFailed +
          syncResult.requests.recordsFailed +
          syncResult.leads.recordsFailed +
          syncResult.calls.recordsFailed;

        const success = totalFailed === 0;

        console.log(`${success ? '✅' : '⚠️'} [Cron] Команда ${settings.teamId}: обработано ${totalProcessed}, создано ${totalCreated}, ошибок ${totalFailed}`);

        results.push({
          teamId: settings.teamId,
          success,
          message: `Обработано: ${totalProcessed}, создано: ${totalCreated}, ошибок: ${totalFailed}`,
          details: syncResult,
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ [Cron] Команда ${settings.teamId}: ошибка -`, errorMsg);
        results.push({
          teamId: settings.teamId,
          success: false,
          message: errorMsg,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`✅ [Cron] Автосинхронизация завершена: ${successCount} успешно, ${failCount} с ошибками`);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      teamsProcessed: results.length,
      successCount,
      failCount,
      results,
    });

  } catch (error) {
    console.error('❌ [Cron] Критическая ошибка:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// GET - проверка статуса cron endpoint
export async function GET() {
  // Получаем статистику по автосинхронизации
  const activeSettings = await db
    .select({
      teamId: amoCrmSettings.teamId,
      subdomain: amoCrmSettings.subdomain,
      syncEnabled: amoCrmSettings.syncEnabled,
      syncInterval: amoCrmSettings.syncInterval,
      lastSyncAt: amoCrmSettings.lastSyncAt,
    })
    .from(amoCrmSettings)
    .where(eq(amoCrmSettings.isActive, true));

  const enabledCount = activeSettings.filter((s) => s.syncEnabled).length;

  return NextResponse.json({
    status: 'ok',
    message: 'amoCRM auto-sync cron endpoint is active',
    timestamp: new Date().toISOString(),
    statistics: {
      totalActiveTeams: activeSettings.length,
      autoSyncEnabled: enabledCount,
      teams: activeSettings.map((s) => ({
        teamId: s.teamId,
        subdomain: s.subdomain,
        syncEnabled: s.syncEnabled,
        syncInterval: s.syncInterval,
        lastSyncAt: s.lastSyncAt,
      })),
    },
  });
}
