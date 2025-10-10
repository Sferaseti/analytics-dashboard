import { db } from '../drizzle';
import { reports, reportTemplates, reportShares } from '../schema';
import { eq, and, desc, asc } from 'drizzle-orm';

export interface CreateReportData {
  name: string;
  description?: string;
  chartType: string;
  dataSource: string;
  config: string;
  filters?: string;
  dateRange?: string;
  customDateFrom?: Date;
  customDateTo?: Date;
  isScheduled?: boolean;
  scheduleFrequency?: string;
  templateId?: number;
}

export interface CreateReportTemplateData {
  name: string;
  description?: string;
  chartType: string;
  dataSource: string;
  config: string;
  filters?: string;
  isPublic?: boolean;
}

// Получить все отчеты для команды
export async function getReportsByTeam(teamId: number) {
  return await db
    .select()
    .from(reports)
    .where(eq(reports.teamId, teamId))
    .orderBy(desc(reports.createdAt));
}

// Получить отчет по ID с проверкой принадлежности к команде
export async function getReportById(reportId: number, teamId: number) {
  const result = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.teamId, teamId)))
    .limit(1);
  
  return result[0] || null;
}

// Создать новый отчет
export async function createReport(data: CreateReportData, teamId: number, userId: number) {
  const result = await db
    .insert(reports)
    .values({
      ...data,
      teamId,
      createdBy: userId,
      updatedAt: new Date(),
    })
    .returning();
  
  return result[0];
}

// Обновить отчет
export async function updateReport(reportId: number, data: Partial<CreateReportData>, teamId: number) {
  const result = await db
    .update(reports)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(reports.id, reportId), eq(reports.teamId, teamId)))
    .returning();
  
  return result[0] || null;
}

// Удалить отчет
export async function deleteReport(reportId: number, teamId: number) {
  const result = await db
    .delete(reports)
    .where(and(eq(reports.id, reportId), eq(reports.teamId, teamId)))
    .returning();
  
  return result[0] || null;
}

// Получить все шаблоны отчетов для команды
export async function getReportTemplatesByTeam(teamId: number) {
  return await db
    .select()
    .from(reportTemplates)
    .where(eq(reportTemplates.teamId, teamId))
    .orderBy(asc(reportTemplates.name));
}

// Получить публичные шаблоны отчетов
export async function getPublicReportTemplates(teamId: number) {
  return await db
    .select()
    .from(reportTemplates)
    .where(and(eq(reportTemplates.teamId, teamId), eq(reportTemplates.isPublic, true)))
    .orderBy(asc(reportTemplates.name));
}

// Создать шаблон отчета
export async function createReportTemplate(data: CreateReportTemplateData, teamId: number, userId: number) {
  const result = await db
    .insert(reportTemplates)
    .values({
      ...data,
      teamId,
      createdBy: userId,
      updatedAt: new Date(),
    })
    .returning();
  
  return result[0];
}

// Получить шаблон отчета по ID
export async function getReportTemplateById(templateId: number, teamId: number) {
  const result = await db
    .select()
    .from(reportTemplates)
    .where(and(eq(reportTemplates.id, templateId), eq(reportTemplates.teamId, teamId)))
    .limit(1);
  
  return result[0] || null;
}

// Обновить шаблон отчета
export async function updateReportTemplate(templateId: number, data: Partial<CreateReportTemplateData>, teamId: number) {
  const result = await db
    .update(reportTemplates)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(reportTemplates.id, templateId), eq(reportTemplates.teamId, teamId)))
    .returning();
  
  return result[0] || null;
}

// Удалить шаблон отчета
export async function deleteReportTemplate(templateId: number, teamId: number) {
  const result = await db
    .delete(reportTemplates)
    .where(and(eq(reportTemplates.id, templateId), eq(reportTemplates.teamId, teamId)))
    .returning();
  
  return result[0] || null;
}

// Поделиться отчетом с пользователем
export async function shareReport(reportId: number, sharedWithUserId: number, permission: 'view' | 'edit', sharedByUserId: number) {
  const result = await db
    .insert(reportShares)
    .values({
      reportId,
      sharedWith: sharedWithUserId,
      permission,
      sharedBy: sharedByUserId,
    })
    .returning();
  
  return result[0];
}

// Получить отчеты, которыми поделились с пользователем
export async function getSharedReports(userId: number) {
  return await db
    .select({
      report: reports,
      permission: reportShares.permission,
      sharedAt: reportShares.sharedAt,
    })
    .from(reportShares)
    .innerJoin(reports, eq(reportShares.reportId, reports.id))
    .where(eq(reportShares.sharedWith, userId))
    .orderBy(desc(reportShares.sharedAt));
}