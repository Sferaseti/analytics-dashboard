import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import { getUserWithTeam } from '@/lib/db/queries';
import { createConnector } from '@/lib/services/uon-amocrm-connector';
import { getTeamUonApiKey } from '@/lib/db/queries/teams';

// POST - запустить синхронизацию U-ON -> amoCRM
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

    // Проверяем наличие U-ON API ключа
    const uonApiKey = await getTeamUonApiKey(userWithTeam.teamId);
    if (!uonApiKey) {
      return NextResponse.json(
        { error: 'U-ON API ключ не настроен. Сначала настройте интеграцию с U-ON.' },
        { status: 400 }
      );
    }

    // Создаем коннектор
    const connector = await createConnector(userWithTeam.teamId);
    if (!connector) {
      return NextResponse.json(
        { error: 'amoCRM не настроен или не активирован. Проверьте настройки интеграции.' },
        { status: 400 }
      );
    }

    // Получаем параметры
    const body = await request.json().catch(() => ({}));
    const { entityType } = body;

    // Инициализируем U-ON клиент
    await connector.initUonClient(uonApiKey);

    let result;

    if (entityType) {
      // Синхронизация конкретного типа сущности
      switch (entityType) {
        case 'tourists':
          result = { tourists: await connector.syncTouristsToContacts() };
          break;
        case 'requests':
          result = { requests: await connector.syncRequestsToLeads() };
          break;
        case 'leads':
          result = { leads: await connector.syncLeadsToAmoLeads() };
          break;
        case 'calls':
          result = { calls: await connector.syncCallsToNotes() };
          break;
        default:
          return NextResponse.json(
            { error: `Неизвестный тип сущности: ${entityType}` },
            { status: 400 }
          );
      }
    } else {
      // Полная синхронизация
      result = await connector.syncAll();
    }

    // Подсчитываем итоги
    const summary = {
      totalProcessed: 0,
      totalCreated: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalFailed: 0,
      errors: [] as string[],
    };

    for (const [key, value] of Object.entries(result)) {
      const syncResult = value as any;
      summary.totalProcessed += syncResult.recordsProcessed || 0;
      summary.totalCreated += syncResult.recordsCreated || 0;
      summary.totalUpdated += syncResult.recordsUpdated || 0;
      summary.totalSkipped += syncResult.recordsSkipped || 0;
      summary.totalFailed += syncResult.recordsFailed || 0;
      if (syncResult.errors?.length) {
        summary.errors.push(...syncResult.errors.map((e: string) => `[${key}] ${e}`));
      }
    }

    return NextResponse.json({
      success: summary.totalFailed === 0,
      message: `Синхронизация завершена. Обработано: ${summary.totalProcessed}, создано: ${summary.totalCreated}, обновлено: ${summary.totalUpdated}`,
      result,
      summary,
    });
  } catch (error) {
    console.error('Error during sync:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
