import { NextRequest, NextResponse } from 'next/server';
import { UonApiClient } from '@/lib/api/uon-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'API ключ не указан. Пожалуйста, передайте apiKey в параметрах запроса.',
          data: null
        },
        { status: 400 }
      );
    }

    console.log(`🔍 [Calls API] Получение звонков, страница ${page}, API ключ: ${apiKey.substring(0, 8)}...`);
    
    const client = new UonApiClient({
      apiKey,
      baseUrl: 'https://api.u-on.ru'
    });
    
    const response = await client.getCallHistory(page);
    
    console.log(`✅ [Calls API] Получено ${response.data?.length || 0} звонков`);
    
    return NextResponse.json({
      success: true,
      data: response.data,
      pagination: response.pagination,
      message: 'Данные о звонках успешно получены'
    });
    
  } catch (error) {
    console.error('❌ [Calls API] Ошибка получения звонков:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    
    return NextResponse.json(
      { 
        success: false,
        error: `Не удалось получить данные о звонках: ${errorMessage}`,
        data: null
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey, page = 1 } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'API ключ не указан. Пожалуйста, передайте apiKey в теле запроса.',
          data: null
        },
        { status: 400 }
      );
    }

    console.log(`🔍 [Calls API POST] Получение звонков, страница ${page}, API ключ: ${apiKey.substring(0, 8)}...`);
    
    const client = new UonApiClient({
      apiKey,
      baseUrl: 'https://api.u-on.ru'
    });
    
    const response = await client.getCallHistory(page);
    
    console.log(`✅ [Calls API POST] Получено ${response.data?.length || 0} звонков`);
    
    return NextResponse.json({
      success: true,
      data: response.data,
      pagination: response.pagination,
      message: 'Данные о звонках успешно получены'
    });
    
  } catch (error) {
    console.error('❌ [Calls API POST] Ошибка получения звонков:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    
    return NextResponse.json(
      { 
        success: false,
        error: `Не удалось получить данные о звонках: ${errorMessage}`,
        data: null
      },
      { status: 500 }
    );
  }
}