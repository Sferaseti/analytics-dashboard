import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, teamMembers, activityLogs } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    // Проверяем, что пользователь авторизован и является супер-админом
    const currentUser = await getUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    if (currentUser.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Нет прав доступа' },
        { status: 403 }
      );
    }

    const userId = parseInt(resolvedParams.id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Неверный ID пользователя' },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь существует
    const userToDelete = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userToDelete.length === 0) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Запрещаем удаление супер-админов
    if (userToDelete[0].role === 'super_admin') {
      return NextResponse.json(
        { error: 'Нельзя удалить супер-админа' },
        { status: 403 }
      );
    }

    // Удаляем связанные записи
    await db.delete(activityLogs).where(eq(activityLogs.userId, userId));
    await db.delete(teamMembers).where(eq(teamMembers.userId, userId));
    
    // Удаляем пользователя
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({
      message: 'Пользователь успешно удален',
      deletedUserId: userId
    });

  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}