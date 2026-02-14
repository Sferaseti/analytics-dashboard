import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { amoCrmSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AmoCrmApiClient } from '@/lib/api/amocrm-client';

// GET - OAuth callback от amoCRM
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Обработка ошибок
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Неизвестная ошибка';
      console.error('❌ [amoCRM OAuth] Ошибка авторизации:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(errorDescription)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Код авторизации не получен', request.url)
      );
    }

    // Извлекаем teamId из state
    let teamId: number | null = null;
    if (state && state.startsWith('team_')) {
      teamId = parseInt(state.replace('team_', ''), 10);
    }

    if (!teamId) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Некорректный state параметр', request.url)
      );
    }

    // Получаем настройки команды
    const [settings] = await db
      .select()
      .from(amoCrmSettings)
      .where(eq(amoCrmSettings.teamId, teamId))
      .limit(1);

    if (!settings) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Настройки amoCRM не найдены', request.url)
      );
    }

    // Создаем клиент и обмениваем код на токены
    const client = new AmoCrmApiClient({
      subdomain: settings.subdomain,
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
      redirectUri: settings.redirectUri,
    });

    const tokenResult = await client.exchangeCodeForTokens(code);

    if (!tokenResult.success || !tokenResult.data) {
      console.error('❌ [amoCRM OAuth] Ошибка обмена кода:', tokenResult.error);
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(tokenResult.error || 'Ошибка получения токенов')}`, request.url)
      );
    }

    // Сохраняем токены в базу данных
    const expiresAt = new Date(Date.now() + tokenResult.data.expires_in * 1000);

    await db
      .update(amoCrmSettings)
      .set({
        accessToken: tokenResult.data.access_token,
        refreshToken: tokenResult.data.refresh_token,
        expiresAt,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(amoCrmSettings.teamId, teamId));

    console.log('✅ [amoCRM OAuth] Авторизация успешна для команды', teamId);

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=amoCRM успешно подключен', request.url)
    );
  } catch (error) {
    console.error('❌ [amoCRM OAuth] Ошибка callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}

// POST - для post_message режима OAuth
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body;

    if (!code) {
      return NextResponse.json({ error: 'Код авторизации не получен' }, { status: 400 });
    }

    // Извлекаем teamId из state
    let teamId: number | null = null;
    if (state && state.startsWith('team_')) {
      teamId = parseInt(state.replace('team_', ''), 10);
    }

    if (!teamId) {
      return NextResponse.json({ error: 'Некорректный state параметр' }, { status: 400 });
    }

    // Получаем настройки команды
    const [settings] = await db
      .select()
      .from(amoCrmSettings)
      .where(eq(amoCrmSettings.teamId, teamId))
      .limit(1);

    if (!settings) {
      return NextResponse.json({ error: 'Настройки amoCRM не найдены' }, { status: 404 });
    }

    // Создаем клиент и обмениваем код на токены
    const client = new AmoCrmApiClient({
      subdomain: settings.subdomain,
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
      redirectUri: settings.redirectUri,
    });

    const tokenResult = await client.exchangeCodeForTokens(code);

    if (!tokenResult.success || !tokenResult.data) {
      return NextResponse.json(
        { error: tokenResult.error || 'Ошибка получения токенов' },
        { status: 400 }
      );
    }

    // Сохраняем токены
    const expiresAt = new Date(Date.now() + tokenResult.data.expires_in * 1000);

    await db
      .update(amoCrmSettings)
      .set({
        accessToken: tokenResult.data.access_token,
        refreshToken: tokenResult.data.refresh_token,
        expiresAt,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(amoCrmSettings.teamId, teamId));

    return NextResponse.json({
      success: true,
      message: 'amoCRM успешно подключен',
    });
  } catch (error) {
    console.error('❌ [amoCRM OAuth POST] Ошибка:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
