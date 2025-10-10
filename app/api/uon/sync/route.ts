import { NextRequest, NextResponse } from 'next/server';
import { createImportService } from '@/lib/services/uon-import';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { getTeamUonApiKey } from '@/lib/db/queries/teams';

export async function POST(request: NextRequest) {
  try {
    // Проверяем аутентификацию
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Пользователь не аутентифицирован',
          results: null
        },
        { status: 401 }
      );
    }

    // Получаем команду пользователя
    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Команда пользователя не найдена',
          results: null
        },
        { status: 403 }
      );
    }

    // Получаем API ключ команды из базы данных
    const teamApiKey = await getTeamUonApiKey(userWithTeam.teamId);
    if (!teamApiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'U-ON API ключ не настроен для вашей команды. Пожалуйста, настройте ключ в настройках API.',
          results: null
        },
        { status: 400 }
      );
    }

    console.log('🚀 [Sync API] Начинаем синхронизацию данных U-ON...');
    const importService = createImportService(teamApiKey, userWithTeam.teamId);
    
    // Запускаем импорт всех данных
    const results = await importService.importAll();
    
    // Проверяем результаты и формируем понятное сообщение
    const touristsSuccess = results.tourists.success;
    const requestsSuccess = results.requests.success;
    const callHistorySuccess = results.callHistory.success;
    const overallSuccess = touristsSuccess && requestsSuccess && callHistorySuccess;

    let message = '';
    let warnings: string[] = [];

    if (overallSuccess) {
      message = 'Синхронизация данных успешно завершена';
      
      const touristsStats = `туристы: ${results.tourists.recordsCreated} создано, ${results.tourists.recordsUpdated} обновлено`;
      const requestsStats = `заявки: ${results.requests.recordsCreated} создано, ${results.requests.recordsUpdated} обновлено`;
      const callsStats = `звонки: ${results.callHistory.recordsCreated} создано, ${results.callHistory.recordsUpdated} обновлено`;
      
      message += ` (${touristsStats}; ${requestsStats}; ${callsStats})`;
    } else {
      message = 'Синхронизация завершена с ошибками';
      
      if (!touristsSuccess) {
        warnings.push(`Ошибка синхронизации туристов: ${results.tourists.error}`);
      }
      if (!requestsSuccess) {
        warnings.push(`Ошибка синхронизации заявок: ${results.requests.error}`);
      }
      if (!callHistorySuccess) {
        warnings.push(`Ошибка синхронизации звонков: ${results.callHistory.error}`);
      }
    }

    // Если используются тестовые данные, добавляем предупреждение
    if (results.tourists.error?.includes('тестовые данные') || 
        results.requests.error?.includes('тестовые данные') ||
        results.callHistory.error?.includes('тестовые данные')) {
      warnings.push('Используются тестовые данные. Проверьте правильность API ключа для получения реальных данных.');
    }

    console.log(`✅ [Sync API] Синхронизация завершена:`, { overallSuccess, message, warnings });
    
    return NextResponse.json({
      success: overallSuccess,
      results,
      message,
      warnings: warnings.length > 0 ? warnings : undefined
    });
    
  } catch (error) {
    console.error('❌ [Sync API] Критическая ошибка синхронизации:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    
    return NextResponse.json(
      { 
        success: false,
        error: `Не удалось выполнить синхронизацию: ${errorMessage}`,
        details: error instanceof Error ? error.stack : undefined,
        results: null
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Используйте POST метод с apiKey в теле запроса для синхронизации данных',
    example: {
      method: 'POST',
      body: { apiKey: 'your_api_key_here' }
    }
  });
}