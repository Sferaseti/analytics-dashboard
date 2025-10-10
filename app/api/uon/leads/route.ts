import { NextRequest, NextResponse } from 'next/server'
import { getUser, getTeamForUser } from '@/lib/db/queries'
import { getLeadsByTeam } from '@/lib/db/queries/uon-data'

export async function GET(request: NextRequest) {
  try {
    // Проверяем аутентификацию пользователя
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Пользователь не аутентифицирован' 
        },
        { status: 401 }
      )
    }

    // Получаем команду пользователя
    const team = await getTeamForUser()
    if (!team) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Команда пользователя не найдена' 
        },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Получаем данные из локальной базы данных, отфильтрованные по команде
    const leads = await getLeadsByTeam(team.id, limit, offset)

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total: leads.length,
        hasMore: leads.length === limit
      },
      success: true
    })

  } catch (error) {
    console.error('Ошибка API /api/uon/leads:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Проверяем аутентификацию пользователя
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Пользователь не аутентифицирован' 
        },
        { status: 401 }
      )
    }

    // Получаем команду пользователя
    const team = await getTeamForUser()
    if (!team) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Команда пользователя не найдена' 
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { page = 1, limit = 50 } = body
    const offset = (page - 1) * limit

    // Получаем данные из локальной базы данных, отфильтрованные по команде
    const leads = await getLeadsByTeam(team.id, limit, offset)

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total: leads.length,
        hasMore: leads.length === limit
      },
      success: true
    })

  } catch (error) {
    console.error('Ошибка API /api/uon/leads:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}