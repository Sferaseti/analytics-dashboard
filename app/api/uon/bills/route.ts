import { NextRequest, NextResponse } from 'next/server'
import { UonApiClient } from '@/lib/api/uon-client'
import { getUser, getTeamForUser } from '@/lib/db/queries'
import { getBillsByTeam } from '@/lib/db/queries/uon-data'

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
    const bills = await getBillsByTeam(team.id, limit, offset)

    return NextResponse.json({
      bills,
      pagination: {
        page,
        limit,
        total: bills.length,
        hasMore: bills.length === limit
      },
      success: true
    })

  } catch (error) {
    console.error('Ошибка API /api/uon/bills:', error)
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
    const bills = await getBillsByTeam(team.id, limit, offset)

    return NextResponse.json({
      bills,
      pagination: {
        page,
        limit,
        total: bills.length,
        hasMore: bills.length === limit
      },
      success: true
    })

  } catch (error) {
    console.error('Ошибка API /api/uon/bills:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}