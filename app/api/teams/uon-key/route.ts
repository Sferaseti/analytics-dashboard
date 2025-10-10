import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import { getUserWithTeam } from '@/lib/db/queries';
import { getTeamUonApiKey, saveTeamUonApiKey, removeTeamUonApiKey } from '@/lib/db/queries/teams';
import { initUonClient } from '@/lib/api/uon-client';

// GET - получить U-ON API ключ команды (замаскированный)
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

    const apiKey = await getTeamUonApiKey(userWithTeam.teamId);
    
    return NextResponse.json({
      hasKey: !!apiKey,
      maskedKey: apiKey ? `${apiKey.substring(0, 8)}••••••••••••••••${apiKey.substring(apiKey.length - 4)}` : null
    });
  } catch (error) {
    console.error('Error getting team U-ON API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - сохранить U-ON API ключ команды
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

    const { apiKey } = await request.json();
    
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Валидация API ключа
    if (apiKey.trim().length < 10) {
      return NextResponse.json({ 
        error: 'API ключ слишком короткий. Корректный API ключ должен содержать не менее 10 символов.' 
      }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9]+$/.test(apiKey.trim())) {
      return NextResponse.json({ 
        error: 'Неверный формат API ключа. API ключ должен содержать только буквы и цифры.' 
      }, { status: 400 });
    }

    // Проверяем подключение к U-ON API
    try {
      const client = initUonClient({ apiKey: apiKey.trim() });
      const testResult = await client.testConnection();
      
      if (!testResult.success) {
        return NextResponse.json({ 
          error: `Не удалось подключиться к U-ON API: ${testResult.error}` 
        }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({ 
        error: 'Ошибка при проверке подключения к U-ON API' 
      }, { status: 400 });
    }

    // Сохраняем ключ в базе данных
    await saveTeamUonApiKey(userWithTeam.teamId, apiKey.trim());

    return NextResponse.json({ 
      success: true, 
      message: 'U-ON API ключ успешно сохранен и проверен' 
    });
  } catch (error) {
    console.error('Error saving team U-ON API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удалить U-ON API ключ команды
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

    await removeTeamUonApiKey(userWithTeam.teamId);

    return NextResponse.json({ 
      success: true, 
      message: 'U-ON API ключ успешно удален' 
    });
  } catch (error) {
    console.error('Error removing team U-ON API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}