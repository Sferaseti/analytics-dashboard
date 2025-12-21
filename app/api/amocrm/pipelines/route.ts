import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import { getUserWithTeam } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { amoCrmSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AmoCrmApiClient } from '@/lib/api/amocrm-client';

// GET - получить воронки продаж из amoCRM
export async function GET(request: NextRequest) {
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

    // Получаем настройки
    const [settings] = await db
      .select()
      .from(amoCrmSettings)
      .where(eq(amoCrmSettings.teamId, userWithTeam.teamId))
      .limit(1);

    if (!settings || !settings.accessToken) {
      return NextResponse.json(
        { error: 'amoCRM не настроен или не авторизован' },
        { status: 400 }
      );
    }

    // Создаем клиент
    const client = new AmoCrmApiClient({
      subdomain: settings.subdomain,
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
      redirectUri: settings.redirectUri,
      accessToken: settings.accessToken,
      refreshToken: settings.refreshToken || undefined,
      expiresAt: settings.expiresAt ? settings.expiresAt.getTime() : undefined,
    });

    // Устанавливаем callback для обновления токенов
    client.onTokenRefresh = async (tokens) => {
      await db
        .update(amoCrmSettings)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(tokens.expiresAt),
          updatedAt: new Date(),
        })
        .where(eq(amoCrmSettings.teamId, userWithTeam.teamId));
    };

    // Получаем воронки
    const result = await client.getPipelines();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Ошибка получения воронок' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      pipelines: result.data,
    });
  } catch (error) {
    console.error('Error getting pipelines:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
