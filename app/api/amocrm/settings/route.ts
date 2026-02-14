import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import { getUserWithTeam } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { amoCrmSettings, amoCrmSyncConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AmoCrmApiClient } from '@/lib/api/amocrm-client';

// GET - получить настройки amoCRM
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

    const [settings] = await db
      .select()
      .from(amoCrmSettings)
      .where(eq(amoCrmSettings.teamId, userWithTeam.teamId))
      .limit(1);

    if (!settings) {
      return NextResponse.json({
        configured: false,
        settings: null,
      });
    }

    // Возвращаем настройки без секретов
    return NextResponse.json({
      configured: true,
      settings: {
        id: settings.id,
        subdomain: settings.subdomain,
        clientId: settings.clientId,
        redirectUri: settings.redirectUri,
        isActive: settings.isActive,
        syncEnabled: settings.syncEnabled,
        syncInterval: settings.syncInterval,
        lastSyncAt: settings.lastSyncAt,
        hasAccessToken: !!settings.accessToken,
        hasRefreshToken: !!settings.refreshToken,
        expiresAt: settings.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error getting amoCRM settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - сохранить настройки amoCRM
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

    const body = await request.json();
    const { subdomain, clientId, clientSecret, redirectUri, syncEnabled, syncInterval } = body;

    // Валидация
    if (!subdomain || !clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: 'Все поля обязательны: subdomain, clientId, clientSecret, redirectUri' },
        { status: 400 }
      );
    }

    // Проверяем существующие настройки
    const [existing] = await db
      .select()
      .from(amoCrmSettings)
      .where(eq(amoCrmSettings.teamId, userWithTeam.teamId))
      .limit(1);

    const settingsData = {
      subdomain: subdomain.replace('.amocrm.ru', '').replace('.kommo.com', '').trim(),
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      redirectUri: redirectUri.trim(),
      syncEnabled: syncEnabled ?? false,
      syncInterval: syncInterval ?? 30,
      updatedAt: new Date(),
    };

    if (existing) {
      // Обновляем существующие настройки
      await db
        .update(amoCrmSettings)
        .set(settingsData)
        .where(eq(amoCrmSettings.teamId, userWithTeam.teamId));
    } else {
      // Создаем новые настройки
      await db.insert(amoCrmSettings).values({
        teamId: userWithTeam.teamId,
        ...settingsData,
        isActive: false,
      });

      // Создаем дефолтные конфигурации синхронизации
      const defaultConfigs = [
        { entityType: 'tourists', direction: 'uon_to_amo', isEnabled: true },
        { entityType: 'requests', direction: 'uon_to_amo', isEnabled: true },
        { entityType: 'leads', direction: 'uon_to_amo', isEnabled: true },
        { entityType: 'calls', direction: 'uon_to_amo', isEnabled: false },
      ];

      for (const config of defaultConfigs) {
        await db.insert(amoCrmSyncConfig).values({
          teamId: userWithTeam.teamId,
          ...config,
        });
      }
    }

    // Генерируем URL для OAuth авторизации
    const client = new AmoCrmApiClient({
      subdomain: settingsData.subdomain,
      clientId: settingsData.clientId,
      clientSecret: settingsData.clientSecret,
      redirectUri: settingsData.redirectUri,
    });

    const authUrl = client.getAuthorizationUrl(`team_${userWithTeam.teamId}`);

    return NextResponse.json({
      success: true,
      message: 'Настройки amoCRM сохранены',
      authUrl,
    });
  } catch (error) {
    console.error('Error saving amoCRM settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удалить настройки amoCRM
export async function DELETE(request: NextRequest) {
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

    // Удаляем настройки и конфигурации
    await db.delete(amoCrmSyncConfig).where(eq(amoCrmSyncConfig.teamId, userWithTeam.teamId));
    await db.delete(amoCrmSettings).where(eq(amoCrmSettings.teamId, userWithTeam.teamId));

    return NextResponse.json({
      success: true,
      message: 'Настройки amoCRM удалены',
    });
  } catch (error) {
    console.error('Error deleting amoCRM settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
