import { NextRequest, NextResponse } from 'next/server';
import { getAutoSyncService, AutoSyncConfig } from '@/lib/services/auto-sync';
import { getUser, getUserWithTeam } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    // Проверяем аутентификацию
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Получаем пользователя с командой
    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, config } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'start': {
        if (!config || !config.apiKey) {
          return NextResponse.json(
            { error: 'API key is required to start auto-sync' },
            { status: 400 }
          );
        }

        // Добавляем teamId к конфигурации
        const configWithTeam: AutoSyncConfig = {
          ...config,
          teamId: userWithTeam.teamId
        };

        const autoSync = getAutoSyncService(configWithTeam);
        autoSync.start();

        return NextResponse.json({
          success: true,
          message: 'Auto-sync started',
          status: autoSync.getStatus()
        });
      }

      case 'stop': {
        try {
          const autoSync = getAutoSyncService();
          autoSync.stop();

          return NextResponse.json({
            success: true,
            message: 'Auto-sync stopped',
            status: autoSync.getStatus()
          });
        } catch (error) {
          return NextResponse.json({
            success: true,
            message: 'Auto-sync was not running'
          });
        }
      }

      case 'status': {
        try {
          const autoSync = getAutoSyncService();
          return NextResponse.json({
            success: true,
            status: autoSync.getStatus()
          });
        } catch (error) {
          return NextResponse.json({
            success: true,
            status: {
              isRunning: false,
              config: null
            }
          });
        }
      }

      case 'update': {
        if (!config) {
          return NextResponse.json(
            { error: 'Config is required to update auto-sync' },
            { status: 400 }
          );
        }

        try {
          const autoSync = getAutoSyncService();
          autoSync.updateConfig(config);

          return NextResponse.json({
            success: true,
            message: 'Auto-sync config updated',
            status: autoSync.getStatus()
          });
        } catch (error) {
          return NextResponse.json(
            { error: 'Auto-sync not initialized. Start it first.' },
            { status: 400 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, status, or update' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Auto-sync API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}