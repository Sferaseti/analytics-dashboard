import { db } from '../drizzle';
import { teams } from '../schema';
import { eq } from 'drizzle-orm';

// Получить U-ON API ключ команды
export async function getTeamUonApiKey(teamId: number): Promise<string | null> {
  const result = await db
    .select({ uonApiKey: teams.uonApiKey })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  
  return result[0]?.uonApiKey || null;
}

// Сохранить U-ON API ключ команды
export async function saveTeamUonApiKey(teamId: number, apiKey: string): Promise<void> {
  await db
    .update(teams)
    .set({ 
      uonApiKey: apiKey,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

// Удалить U-ON API ключ команды
export async function removeTeamUonApiKey(teamId: number): Promise<void> {
  await db
    .update(teams)
    .set({ 
      uonApiKey: null,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

// Проверить, есть ли у команды U-ON API ключ
export async function hasTeamUonApiKey(teamId: number): Promise<boolean> {
  const result = await db
    .select({ uonApiKey: teams.uonApiKey })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  return !!(result[0]?.uonApiKey);
}

// ============= Yandex Cloud Settings =============

export interface YandexCloudSettings {
  folderId: string | null;
  accessKeyId: string | null;
  secretAccessKey: string | null;
  bucket: string | null;
  oauthToken: string | null;
  autoBackup: boolean;
  backupFrequency: string | null;
  lastBackup: Date | null;
}

// Получить Yandex Cloud настройки команды
export async function getTeamYandexCloudSettings(teamId: number): Promise<YandexCloudSettings | null> {
  const result = await db
    .select({
      folderId: teams.yandexCloudFolderId,
      accessKeyId: teams.yandexCloudAccessKeyId,
      secretAccessKey: teams.yandexCloudSecretAccessKey,
      bucket: teams.yandexCloudBucket,
      oauthToken: teams.yandexCloudOauthToken,
      autoBackup: teams.yandexCloudAutoBackup,
      backupFrequency: teams.yandexCloudBackupFrequency,
      lastBackup: teams.yandexCloudLastBackup,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!result[0]) return null;

  return {
    folderId: result[0].folderId,
    accessKeyId: result[0].accessKeyId,
    secretAccessKey: result[0].secretAccessKey,
    bucket: result[0].bucket,
    oauthToken: result[0].oauthToken,
    autoBackup: result[0].autoBackup ?? false,
    backupFrequency: result[0].backupFrequency,
    lastBackup: result[0].lastBackup,
  };
}

// Сохранить Yandex Cloud настройки команды
export async function saveTeamYandexCloudSettings(
  teamId: number,
  settings: Partial<YandexCloudSettings>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (settings.folderId !== undefined) {
    updateData.yandexCloudFolderId = settings.folderId;
  }
  if (settings.accessKeyId !== undefined) {
    updateData.yandexCloudAccessKeyId = settings.accessKeyId;
  }
  if (settings.secretAccessKey !== undefined) {
    updateData.yandexCloudSecretAccessKey = settings.secretAccessKey;
  }
  if (settings.bucket !== undefined) {
    updateData.yandexCloudBucket = settings.bucket;
  }
  if (settings.oauthToken !== undefined) {
    updateData.yandexCloudOauthToken = settings.oauthToken;
  }
  if (settings.autoBackup !== undefined) {
    updateData.yandexCloudAutoBackup = settings.autoBackup;
  }
  if (settings.backupFrequency !== undefined) {
    updateData.yandexCloudBackupFrequency = settings.backupFrequency;
  }
  if (settings.lastBackup !== undefined) {
    updateData.yandexCloudLastBackup = settings.lastBackup;
  }

  await db
    .update(teams)
    .set(updateData)
    .where(eq(teams.id, teamId));
}

// Удалить Yandex Cloud настройки команды
export async function removeTeamYandexCloudSettings(teamId: number): Promise<void> {
  await db
    .update(teams)
    .set({
      yandexCloudFolderId: null,
      yandexCloudAccessKeyId: null,
      yandexCloudSecretAccessKey: null,
      yandexCloudBucket: null,
      yandexCloudOauthToken: null,
      yandexCloudAutoBackup: false,
      yandexCloudBackupFrequency: null,
      yandexCloudLastBackup: null,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

// Проверить, настроен ли Yandex Cloud для команды
export async function hasTeamYandexCloudSettings(teamId: number): Promise<boolean> {
  const result = await db
    .select({
      accessKeyId: teams.yandexCloudAccessKeyId,
      bucket: teams.yandexCloudBucket,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  return !!(result[0]?.accessKeyId && result[0]?.bucket);
}

// Обновить время последнего бэкапа
export async function updateTeamLastBackup(teamId: number): Promise<void> {
  await db
    .update(teams)
    .set({
      yandexCloudLastBackup: new Date(),
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}