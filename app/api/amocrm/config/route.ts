import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import { getUserWithTeam } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { amoCrmSyncConfig } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - получить конфигурации синхронизации
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

    const configs = await db
      .select()
      .from(amoCrmSyncConfig)
      .where(eq(amoCrmSyncConfig.teamId, userWithTeam.teamId));

    return NextResponse.json({
      success: true,
      configs: configs.map((config) => ({
        ...config,
        statusMapping: config.statusMapping ? JSON.parse(config.statusMapping) : [],
        fieldMapping: config.fieldMapping ? JSON.parse(config.fieldMapping) : [],
      })),
    });
  } catch (error) {
    console.error('Error getting sync configs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - обновить конфигурацию синхронизации
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
      entityType,
      direction,
      isEnabled,
      pipelineId,
      statusMapping,
      fieldMapping,
      createIfNotExists,
      updateExisting,
    } = body;

    if (!entityType) {
      return NextResponse.json({ error: 'entityType is required' }, { status: 400 });
    }

    // Проверяем существование конфига
    const [existing] = await db
      .select()
      .from(amoCrmSyncConfig)
      .where(
        and(
          eq(amoCrmSyncConfig.teamId, userWithTeam.teamId),
          eq(amoCrmSyncConfig.entityType, entityType)
        )
      )
      .limit(1);

    const configData = {
      direction: direction || 'uon_to_amo',
      isEnabled: isEnabled ?? true,
      pipelineId: pipelineId || null,
      statusMapping: statusMapping ? JSON.stringify(statusMapping) : null,
      fieldMapping: fieldMapping ? JSON.stringify(fieldMapping) : null,
      createIfNotExists: createIfNotExists ?? true,
      updateExisting: updateExisting ?? true,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(amoCrmSyncConfig)
        .set(configData)
        .where(eq(amoCrmSyncConfig.id, existing.id));
    } else {
      await db.insert(amoCrmSyncConfig).values({
        teamId: userWithTeam.teamId,
        entityType,
        ...configData,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Конфигурация синхронизации обновлена',
    });
  } catch (error) {
    console.error('Error updating sync config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - массовое обновление конфигураций
export async function PUT(request: NextRequest) {
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
    const { configs } = body;

    if (!Array.isArray(configs)) {
      return NextResponse.json({ error: 'configs must be an array' }, { status: 400 });
    }

    for (const config of configs) {
      const { entityType, ...configData } = config;

      if (!entityType) continue;

      const [existing] = await db
        .select()
        .from(amoCrmSyncConfig)
        .where(
          and(
            eq(amoCrmSyncConfig.teamId, userWithTeam.teamId),
            eq(amoCrmSyncConfig.entityType, entityType)
          )
        )
        .limit(1);

      const data = {
        direction: configData.direction || 'uon_to_amo',
        isEnabled: configData.isEnabled ?? true,
        pipelineId: configData.pipelineId || null,
        statusMapping: configData.statusMapping
          ? typeof configData.statusMapping === 'string'
            ? configData.statusMapping
            : JSON.stringify(configData.statusMapping)
          : null,
        fieldMapping: configData.fieldMapping
          ? typeof configData.fieldMapping === 'string'
            ? configData.fieldMapping
            : JSON.stringify(configData.fieldMapping)
          : null,
        createIfNotExists: configData.createIfNotExists ?? true,
        updateExisting: configData.updateExisting ?? true,
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(amoCrmSyncConfig)
          .set(data)
          .where(eq(amoCrmSyncConfig.id, existing.id));
      } else {
        await db.insert(amoCrmSyncConfig).values({
          teamId: userWithTeam.teamId,
          entityType,
          ...data,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Конфигурации синхронизации обновлены',
    });
  } catch (error) {
    console.error('Error updating sync configs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
