import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { uonCallHistory } from '@/lib/db/schema';
import { getUser, getUserWithTeam } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    // Получаем пользователя и его команду
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    const { count = 10 } = await request.json();
    
    console.log(`🧪 [Test Call History] Создание ${count} тестовых звонков`);
    
    const testCalls = [];
    const phones = [
      '+7 (495) 123-45-67',
      '+7 (926) 987-65-43',
      '+7 (812) 555-12-34',
      '+7 (903) 777-88-99',
      '+7 (916) 444-55-66',
      '+7 (499) 111-22-33',
      '+7 (985) 666-77-88',
      '+7 (495) 999-00-11',
      '+7 (925) 333-44-55',
      '+7 (906) 222-33-44'
    ];
    
    const directions = ['incoming', 'outgoing'];
    const statuses = ['answered', 'missed', 'busy'];
    const notes = [
      'Консультация по туру в Турцию',
      'Запрос цен на отдых в Египте',
      'Бронирование тура в Таиланд',
      'Вопрос по визе в Европу',
      'Отмена бронирования',
      'Перенос даты поездки',
      'Дополнительные услуги',
      'Страховка для поездки',
      'Групповой тур',
      'Индивидуальный маршрут'
    ];
    
    for (let i = 0; i < count; i++) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const duration = Math.floor(Math.random() * 600); // 0-10 минут
      const callDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Последние 7 дней
      
      testCalls.push({
        teamId: userWithTeam.teamId, // Добавляем teamId
        uonId: 1000000 + i, // простой integer ID
        phone: phones[i % phones.length],
        direction,
        duration,
        start: callDate.toISOString(),
        managerId: Math.floor(Math.random() * 5) + 1,
        clientId: Math.floor(Math.random() * 100) + 1,
        recordLink: duration > 30 ? `https://example.com/record_${i}.mp3` : null,
        note: notes[i % notes.length],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Вставляем тестовые данные
    await db.insert(uonCallHistory).values(testCalls);
    
    console.log(`✅ [Test Call History] Создано ${count} тестовых звонков`);
    
    return NextResponse.json({
      success: true,
      message: `Создано ${count} тестовых звонков`,
      data: testCalls
    });
    
  } catch (error) {
    console.error('❌ [Test Call History] Ошибка создания тестовых данных:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: `Не удалось создать тестовые данные: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      },
      { status: 500 }
    );
  }
}