import { NextRequest, NextResponse } from 'next/server'
import { UonApiClient } from '@/lib/api/uon-client'
import { verifyToken } from '@/lib/auth/session'
import { getUserWithTeam } from '@/lib/db/queries'
import { getTeamUonApiKey } from '@/lib/db/queries/teams'

export async function GET(request: NextRequest) {
  try {
    // Проверяем аутентификацию пользователя
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload.user?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Получаем команду пользователя
    const userWithTeam = await getUserWithTeam(payload.user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Получаем U-ON API ключ команды
    const teamApiKey = await getTeamUonApiKey(userWithTeam.teamId);
    if (!teamApiKey) {
      return NextResponse.json({ 
        error: 'U-ON API ключ не настроен для вашей команды. Пожалуйста, настройте его в разделе "Настройки API".' 
      }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query')
    const phone = searchParams.get('phone')
    const email = searchParams.get('email')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Инициализация API клиента с ключом команды
    const apiClient = new UonApiClient({
      apiKey: teamApiKey,
      baseUrl: process.env.UON_API_URL || 'https://api.u-on.ru'
    })

    // Получение данных через U-ON API
    const response = await apiClient.getClients({
      search: query || undefined,
      limit,
      offset: (page - 1) * limit
    })

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Ошибка получения данных' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      clients: response.data,
      pagination: response.pagination,
      success: true
    })

  } catch (error) {
    console.error('Ошибка API /api/uon/clients:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, phone, email, page = 1, limit = 50 } = body

    // Инициализация API клиента
    const apiClient = new UonApiClient({
      apiKey: process.env.UON_API_KEY || '',
      baseUrl: process.env.UON_API_URL || 'https://api.u-on.ru'
    })

    // Получение данных через U-ON API
    const response = await apiClient.getClients({
      search: query || undefined,
      limit,
      offset: (page - 1) * limit
    })

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Ошибка получения данных' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      clients: response.data,
      pagination: response.pagination,
      success: true
    })

  } catch (error) {
    console.error('Ошибка API /api/uon/clients:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}