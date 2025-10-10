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