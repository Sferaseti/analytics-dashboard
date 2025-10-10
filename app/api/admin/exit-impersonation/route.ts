import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.impersonation?.isImpersonating) {
      return NextResponse.json(
        { error: 'Не в режиме имперсонации' },
        { status: 400 }
      );
    }

    const { originalUserId, originalUserRole } = session.impersonation;
    
    // Получаем данные оригинального админа
    const originalAdminResult = await db
      .select()
      .from(users)
      .where(eq(users.id, session.impersonation.originalUserId))
      .limit(1);

    if (originalAdminResult.length === 0) {
      return NextResponse.json({ error: 'Оригинальный пользователь не найден' }, { status: 404 });
    }

    const originalAdmin = originalAdminResult[0];

    // Восстанавливаем сессию оригинального админа
    await setSession({
      user: { id: originalAdmin.id },
      role: originalAdmin.role,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 дней
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при выходе из имперсонации:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}