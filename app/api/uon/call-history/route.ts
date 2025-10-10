import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { uonCallHistory } from '@/lib/db/schema';
import { desc, count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log(`🔍 [Call History API] Получение истории звонков из БД, страница ${page}, лимит ${limit}`);
    
    // Получаем общее количество записей
    const totalCountResult = await db.select({ count: count() }).from(uonCallHistory);
    const totalCount = totalCountResult[0]?.count || 0;
    
    // Получаем записи с пагинацией
    const calls = await db.select()
      .from(uonCallHistory)
      .orderBy(desc(uonCallHistory.createdAt))
      .limit(limit)
      .offset(offset);

    console.log(`✅ [Call History API] Получено ${calls.length} звонков из БД (всего: ${totalCount})`);
    
    // Преобразуем данные в формат, ожидаемый UI
    const formattedCalls = calls.map(call => ({
      id: call.uonId,
      phone: call.phone,
      direction: call.direction,
      duration: call.duration,
      status: (call.duration || 0) > 0 ? 'answered' : 'missed', // Определяем статус по длительности
      call_date: call.start || call.createdAt.toISOString(),
      manager_id: call.managerId,
      client_id: call.clientId,
      recording_url: call.recordLink,
      notes: call.note,
      created_at: call.createdAt.toISOString()
    }));

    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      success: true,
      data: formattedCalls,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalCount,
        per_page: limit
      },
      message: `Получено ${calls.length} звонков из базы данных`
    });
    
  } catch (error) {
    console.error('❌ [Call History API] Ошибка получения истории звонков:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    
    return NextResponse.json(
      { 
        success: false,
        error: `Не удалось получить историю звонков: ${errorMessage}`,
        data: []
      },
      { status: 500 }
    );
  }
}