import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { uonCallHistory } from '@/lib/db/schema';

export async function DELETE() {
  try {
    // Удаляем все записи из таблицы звонков
    await db.delete(uonCallHistory);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Все данные звонков удалены' 
    });
  } catch (error) {
    console.error('Ошибка при удалении данных:', error);
    return NextResponse.json(
      { success: false, error: 'Не удалось удалить данные' },
      { status: 500 }
    );
  }
}