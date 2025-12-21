import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import { getUserWithTeam } from '@/lib/db/queries';
import {
  getTeamYandexCloudSettings,
  saveTeamYandexCloudSettings,
  removeTeamYandexCloudSettings,
} from '@/lib/db/queries/teams';
import { YandexCloudStorageClient } from '@/lib/api/yandex-cloud-client';

// GET - получить Yandex Cloud настройки команды (с маскированными секретами)
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

    const settings = await getTeamYandexCloudSettings(userWithTeam.teamId);

    if (!settings) {
      return NextResponse.json({
        configured: false,
        settings: null,
      });
    }

    // Маскируем секретные данные
    return NextResponse.json({
      configured: !!(settings.accessKeyId && settings.bucket),
      settings: {
        folderId: settings.folderId,
        accessKeyId: settings.accessKeyId
          ? `${settings.accessKeyId.substring(0, 8)}••••••••`
          : null,
        hasSecretKey: !!settings.secretAccessKey,
        bucket: settings.bucket,
        hasOauthToken: !!settings.oauthToken,
        autoBackup: settings.autoBackup,
        backupFrequency: settings.backupFrequency,
        lastBackup: settings.lastBackup?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error getting Yandex Cloud settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - сохранить Yandex Cloud настройки команды
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
    const {
      folderId,
      accessKeyId,
      secretAccessKey,
      bucket,
      oauthToken,
      autoBackup,
      backupFrequency,
    } = body;

    // Валидация обязательных полей для Object Storage
    if (!accessKeyId || typeof accessKeyId !== 'string') {
      return NextResponse.json(
        { error: 'Access Key ID обязателен' },
        { status: 400 }
      );
    }

    if (!secretAccessKey || typeof secretAccessKey !== 'string') {
      return NextResponse.json(
        { error: 'Secret Access Key обязателен' },
        { status: 400 }
      );
    }

    if (!bucket || typeof bucket !== 'string') {
      return NextResponse.json(
        { error: 'Название бакета обязательно' },
        { status: 400 }
      );
    }

    // Валидация формата бакета
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) {
      return NextResponse.json(
        {
          error:
            'Неверный формат названия бакета. Используйте только строчные буквы, цифры, точки и дефисы.',
        },
        { status: 400 }
      );
    }

    // Проверяем подключение к Yandex Cloud Object Storage
    try {
      const storageClient = new YandexCloudStorageClient({
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        bucket: bucket.trim(),
        region: 'ru-central1',
      });

      const testResult = await storageClient.listFiles('', 1);

      if (!testResult.success) {
        return NextResponse.json(
          {
            error: `Не удалось подключиться к Yandex Cloud Object Storage: ${testResult.error}`,
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Yandex Cloud connection test error:', error);
      return NextResponse.json(
        { error: 'Ошибка при проверке подключения к Yandex Cloud Object Storage' },
        { status: 400 }
      );
    }

    // Сохраняем настройки в базе данных
    await saveTeamYandexCloudSettings(userWithTeam.teamId, {
      folderId: folderId?.trim() || null,
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      bucket: bucket.trim(),
      oauthToken: oauthToken?.trim() || null,
      autoBackup: autoBackup ?? false,
      backupFrequency: backupFrequency || null,
    });

    return NextResponse.json({
      success: true,
      message: 'Yandex Cloud настройки успешно сохранены и проверены',
    });
  } catch (error) {
    console.error('Error saving Yandex Cloud settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - обновить отдельные настройки
export async function PATCH(request: NextRequest) {
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

    // Обновляем только переданные настройки
    await saveTeamYandexCloudSettings(userWithTeam.teamId, body);

    return NextResponse.json({
      success: true,
      message: 'Настройки обновлены',
    });
  } catch (error) {
    console.error('Error updating Yandex Cloud settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удалить Yandex Cloud настройки команды
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

    await removeTeamYandexCloudSettings(userWithTeam.teamId);

    return NextResponse.json({
      success: true,
      message: 'Yandex Cloud настройки успешно удалены',
    });
  } catch (error) {
    console.error('Error removing Yandex Cloud settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
