import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import { getUserWithTeam } from '@/lib/db/queries';
import { getTeamYandexCloudSettings } from '@/lib/db/queries/teams';
import { YandexCloudStorageClient } from '@/lib/api/yandex-cloud-client';

// POST - тестирование подключения к Yandex Cloud
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

    // Проверяем, переданы ли настройки в теле запроса или используем сохраненные
    const body = await request.json().catch(() => ({}));
    let accessKeyId: string;
    let secretAccessKey: string;
    let bucket: string;

    if (body.accessKeyId && body.secretAccessKey && body.bucket) {
      // Используем переданные настройки (для тестирования перед сохранением)
      accessKeyId = body.accessKeyId;
      secretAccessKey = body.secretAccessKey;
      bucket = body.bucket;
    } else {
      // Используем сохраненные настройки
      const settings = await getTeamYandexCloudSettings(userWithTeam.teamId);

      if (!settings?.accessKeyId || !settings?.secretAccessKey || !settings?.bucket) {
        return NextResponse.json(
          { error: 'Yandex Cloud настройки не найдены. Сначала сохраните настройки.' },
          { status: 400 }
        );
      }

      accessKeyId = settings.accessKeyId;
      secretAccessKey = settings.secretAccessKey;
      bucket = settings.bucket;
    }

    console.log(`[YC Test] Тестирование подключения к бакету: ${bucket}`);

    const storageClient = new YandexCloudStorageClient({
      accessKeyId,
      secretAccessKey,
      bucket,
      region: 'ru-central1',
    });

    const startTime = Date.now();

    // Тест 1: Список файлов
    const listResult = await storageClient.listFiles('', 5);
    const listDuration = Date.now() - startTime;

    if (!listResult.success) {
      return NextResponse.json({
        success: false,
        error: `Не удалось получить список файлов: ${listResult.error}`,
        tests: {
          listFiles: { success: false, error: listResult.error, duration: listDuration },
        },
      });
    }

    // Тест 2: Загрузка тестового файла
    const testFileName = `_test_connection_${Date.now()}.txt`;
    const testContent = `Test connection at ${new Date().toISOString()}`;

    const uploadStart = Date.now();
    const uploadResult = await storageClient.uploadFile(testFileName, testContent, 'text/plain');
    const uploadDuration = Date.now() - uploadStart;

    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: `Не удалось загрузить тестовый файл: ${uploadResult.error}`,
        tests: {
          listFiles: { success: true, duration: listDuration, filesCount: listResult.data?.length ?? 0 },
          uploadFile: { success: false, error: uploadResult.error, duration: uploadDuration },
        },
      });
    }

    // Тест 3: Удаление тестового файла
    const deleteStart = Date.now();
    const deleteResult = await storageClient.deleteFile(testFileName);
    const deleteDuration = Date.now() - deleteStart;

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Подключение к Yandex Cloud Object Storage успешно',
      bucket,
      tests: {
        listFiles: {
          success: true,
          duration: listDuration,
          filesCount: listResult.data?.length ?? 0,
        },
        uploadFile: {
          success: true,
          duration: uploadDuration,
        },
        deleteFile: {
          success: deleteResult.success,
          duration: deleteDuration,
          error: deleteResult.error,
        },
      },
      totalDuration,
    });
  } catch (error) {
    console.error('Error testing Yandex Cloud connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
