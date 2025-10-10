import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Получаем актуальную информацию о пользователе из базы данных
    const currentUserResult = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (currentUserResult.length === 0) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const currentUser = currentUserResult[0];

    // Проверяем, что пользователь - супер-админ
    if (currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    // Получаем ID пользователя для имперсонации
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'ID пользователя не указан' }, { status: 400 });
    }

    // Находим пользователя в базе данных
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (targetUser.length === 0) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const user = targetUser[0];

    // Запрещаем имперсонацию других супер-админов
    if (user.role === 'super_admin') {
      return NextResponse.json({ error: 'Нельзя имперсонировать супер-админа' }, { status: 403 });
    }

    // Создаем новую сессию с информацией об имперсонации
    const impersonationSession = {
      user: { id: user.id },
      role: user.role,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      impersonation: {
        originalUserId: currentUser.id,
        originalUserRole: currentUser.role,
        isImpersonating: true,
      },
    };

    await setSession(impersonationSession);

    return NextResponse.json({ success: true, message: 'Имперсонация успешна' });
  } catch (error) {
    console.error('Ошибка имперсонации:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}