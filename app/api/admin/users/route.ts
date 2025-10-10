import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';

export async function GET() {
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

    // Получаем всех пользователей с информацией о командах
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        teamName: teams.name,
      })
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .leftJoin(teams, eq(teamMembers.teamId, teams.id));

    return NextResponse.json({
      users: allUsers,
      total: allUsers.length
    });

  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}