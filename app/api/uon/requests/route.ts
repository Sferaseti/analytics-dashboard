import { NextRequest, NextResponse } from 'next/server'
import { getUonClient } from '@/lib/api/uon-client'
import { getUser, getTeamForUser } from '@/lib/db/queries'
import { getRequestsByTeam } from '@/lib/db/queries/uon-data'

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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Получаем данные из локальной базы данных, отфильтрованные по команде
    const requests = await getRequestsByTeam(team.id, limit, offset)

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total: requests.length,
        hasMore: requests.length === limit
      }
    })

  } catch (error) {
    console.error('❌ [API] Ошибка в /api/uon/requests:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Внутренняя ошибка сервера при получении заявок',
        data: []
      },
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
    const { page = 1, limit = 20 } = body
    const offset = (page - 1) * limit

    // Получаем данные из локальной базы данных, отфильтрованные по команде
    const requests = await getRequestsByTeam(team.id, limit, offset)

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total: requests.length,
        hasMore: requests.length === limit
      }
    })

  } catch (error) {
    console.error('❌ [API] Ошибка в POST /api/uon/requests:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Внутренняя ошибка сервера при получении заявок',
        data: []
      },
      { status: 500 }
    )
  }
}