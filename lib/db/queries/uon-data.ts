import { db } from '../drizzle';
import { 
  uonTourists, 
  uonRequests, 
  uonBills, 
  uonClients, 
  uonLeads, 
  uonManagers, 
  uonCallHistory 
} from '../schema';
import { eq, and, desc, asc, count, sql, gte, lte, between } from 'drizzle-orm';

// Туристы
export async function getTouristsByTeam(teamId: number, limit = 50, offset = 0) {
  return await db
    .select()
    .from(uonTourists)
    .where(eq(uonTourists.teamId, teamId))
    .orderBy(desc(uonTourists.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getTouristById(touristId: number, teamId: number) {
  const result = await db
    .select()
    .from(uonTourists)
    .where(and(eq(uonTourists.id, touristId), eq(uonTourists.teamId, teamId)))
    .limit(1);
  
  return result[0] || null;
}

// Заявки
export async function getRequestsByTeam(teamId: number, limit = 50, offset = 0) {
  return await db
    .select()
    .from(uonRequests)
    .where(eq(uonRequests.teamId, teamId))
    .orderBy(desc(uonRequests.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getRequestById(requestId: number, teamId: number) {
  const result = await db
    .select()
    .from(uonRequests)
    .where(and(eq(uonRequests.id, requestId), eq(uonRequests.teamId, teamId)))
    .limit(1);
  
  return result[0] || null;
}

// Счета
export async function getBillsByTeam(teamId: number, limit = 50, offset = 0) {
  return await db
    .select()
    .from(uonBills)
    .where(eq(uonBills.teamId, teamId))
    .orderBy(desc(uonBills.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getBillById(billId: number, teamId: number) {
  const result = await db
    .select()
    .from(uonBills)
    .where(and(eq(uonBills.id, billId), eq(uonBills.teamId, teamId)))
    .limit(1);
  
  return result[0] || null;
}

// Клиенты
export async function getClientsByTeam(teamId: number, limit = 50, offset = 0) {
  return await db
    .select()
    .from(uonClients)
    .where(eq(uonClients.teamId, teamId))
    .orderBy(desc(uonClients.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getClientById(clientId: number, teamId: number) {
  const result = await db
    .select()
    .from(uonClients)
    .where(and(eq(uonClients.id, clientId), eq(uonClients.teamId, teamId)))
    .limit(1);
  
  return result[0] || null;
}

// Лиды
export async function getLeadsByTeam(teamId: number, limit = 50, offset = 0) {
  return await db
    .select()
    .from(uonLeads)
    .where(eq(uonLeads.teamId, teamId))
    .orderBy(desc(uonLeads.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getLeadById(leadId: number, teamId: number) {
  const result = await db
    .select()
    .from(uonLeads)
    .where(and(eq(uonLeads.id, leadId), eq(uonLeads.teamId, teamId)))
    .limit(1);
  
  return result[0] || null;
}

// Менеджеры
export async function getManagersByTeam(teamId: number) {
  return await db
    .select()
    .from(uonManagers)
    .where(eq(uonManagers.teamId, teamId))
    .orderBy(asc(uonManagers.name));
}

export async function getManagerById(managerId: number, teamId: number) {
  const result = await db
    .select()
    .from(uonManagers)
    .where(and(eq(uonManagers.id, managerId), eq(uonManagers.teamId, teamId)))
    .limit(1);
  
  return result[0] || null;
}

// История звонков
export async function getCallHistoryByTeam(teamId: number, limit = 50, offset = 0) {
  return await db
    .select()
    .from(uonCallHistory)
    .where(eq(uonCallHistory.teamId, teamId))
    .orderBy(desc(uonCallHistory.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getCallHistoryById(callId: number, teamId: number) {
  const result = await db
    .select()
    .from(uonCallHistory)
    .where(and(eq(uonCallHistory.id, callId), eq(uonCallHistory.teamId, teamId)))
    .limit(1);
  
  return result[0] || null;
}

// Аналитические запросы для отчетов

// Статистика по звонкам за период
export async function getCallStatsByDateRange(
  teamId: number, 
  startDate: Date, 
  endDate: Date
) {
  return await db
    .select({
      date: sql<string>`DATE(${uonCallHistory.createdAt})`,
      totalCalls: count(),
      incomingCalls: count(sql`CASE WHEN ${uonCallHistory.direction} = 'incoming' THEN 1 END`),
      outgoingCalls: count(sql`CASE WHEN ${uonCallHistory.direction} = 'outgoing' THEN 1 END`),
      avgDuration: sql<number>`AVG(${uonCallHistory.duration})`,
    })
    .from(uonCallHistory)
    .where(
      and(
        eq(uonCallHistory.teamId, teamId),
        between(uonCallHistory.createdAt, startDate, endDate)
      )
    )
    .groupBy(sql`DATE(${uonCallHistory.createdAt})`)
    .orderBy(sql`DATE(${uonCallHistory.createdAt})`);
}

// Статистика по менеджерам
export async function getManagerCallStats(teamId: number, startDate?: Date, endDate?: Date) {
  const conditions = [eq(uonCallHistory.teamId, teamId)];
  
  if (startDate && endDate) {
    conditions.push(between(uonCallHistory.createdAt, startDate, endDate));
  }

  return await db
    .select({
      managerId: uonCallHistory.managerId,
      managerName: uonManagers.name,
      totalCalls: count(),
      avgDuration: sql<number>`AVG(${uonCallHistory.duration})`,
    })
    .from(uonCallHistory)
    .leftJoin(uonManagers, eq(uonCallHistory.managerId, uonManagers.uonId))
    .where(and(...conditions))
    .groupBy(uonCallHistory.managerId, uonManagers.name)
    .orderBy(desc(count()));
}

// Статистика по клиентам
export async function getClientStats(teamId: number) {
  return await db
    .select({
      totalClients: count(),
      newClientsThisMonth: count(sql`CASE WHEN ${uonClients.createdAt} >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END`),
    })
    .from(uonClients)
    .where(eq(uonClients.teamId, teamId));
}

// Статистика по лидам
export async function getLeadStats(teamId: number) {
  return await db
    .select({
      totalLeads: count(),
      newLeadsThisMonth: count(sql`CASE WHEN ${uonLeads.createdAt} >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END`),
      convertedLeads: count(sql`CASE WHEN ${uonLeads.status} = 'converted' THEN 1 END`),
    })
    .from(uonLeads)
    .where(eq(uonLeads.teamId, teamId));
}

// Статистика по заявкам
export async function getRequestStats(teamId: number) {
  return await db
    .select({
      totalRequests: count(),
      newRequestsThisMonth: count(sql`CASE WHEN ${uonRequests.createdAt} >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END`),
      completedRequests: count(sql`CASE WHEN ${uonRequests.status} = 'completed' THEN 1 END`),
      pendingRequests: count(sql`CASE WHEN ${uonRequests.status} = 'pending' THEN 1 END`),
    })
    .from(uonRequests)
    .where(eq(uonRequests.teamId, teamId));
}

// Статистика по счетам
export async function getBillStats(teamId: number, startDate?: Date, endDate?: Date) {
  const conditions = [eq(uonBills.teamId, teamId)];
  
  if (startDate && endDate) {
    conditions.push(between(uonBills.createdAt, startDate, endDate));
  }

  return await db
    .select({
      totalBills: count(),
      totalAmount: sql<number>`SUM(${uonBills.amount})`,
      paidBills: count(sql`CASE WHEN ${uonBills.status} = 'paid' THEN 1 END`),
      unpaidBills: count(sql`CASE WHEN ${uonBills.status} = 'unpaid' THEN 1 END`),
      paidAmount: sql<number>`SUM(CASE WHEN ${uonBills.status} = 'paid' THEN ${uonBills.amount} ELSE 0 END)`,
    })
    .from(uonBills)
    .where(and(...conditions));
}