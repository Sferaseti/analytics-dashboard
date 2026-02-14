import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'), // member, owner, super_admin
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
  uonApiKey: text('uon_api_key'), // U-ON API ключ для команды
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}

// U-ON.RU Data Tables
export const uonTourists = pgTable('uon_tourists', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id), // Привязка к команде для мультитенантности
  uonId: integer('uon_id').notNull(), // Убираем unique, так как разные команды могут иметь одинаковые ID
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  birthDate: varchar('birth_date', { length: 20 }),
  passportNumber: varchar('passport_number', { length: 50 }),
  lastTripDate: varchar('last_trip_date', { length: 20 }),
  totalTrips: integer('total_trips').default(0),
  totalSpent: decimal('total_spent', { precision: 12, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).default('active'), // active, inactive
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
});

export const uonRequests = pgTable('uon_requests', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id), // Привязка к команде для мультитенантности
  uonId: integer('uon_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  departureDate: varchar('departure_date', { length: 20 }),
  returnDate: varchar('return_date', { length: 20 }),
  adults: integer('adults').default(0),
  children: integer('children').default(0),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).default('new'), // new, in_progress, confirmed, cancelled
  managerId: integer('manager_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
});

export const uonBills = pgTable('uon_bills', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id), // Привязка к команде для мультитенантности
  uonId: integer('uon_id').notNull(),
  requestId: integer('request_id'),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('RUB'),
  status: varchar('status', { length: 20 }).default('pending'), // pending, paid, cancelled
  paidAt: varchar('paid_at', { length: 30 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
});

export const uonClients = pgTable('uon_clients', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id), // Привязка к команде для мультитенантности
  uonId: integer('uon_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  country: varchar('country', { length: 100 }),
  totalSpent: decimal('total_spent', { precision: 12, scale: 2 }).default('0'),
  requestsCount: integer('requests_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
});

export const uonLeads = pgTable('uon_leads', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id), // Привязка к команде для мультитенантности
  uonId: integer('uon_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  countryInterest: varchar('country_interest', { length: 100 }),
  budget: decimal('budget', { precision: 12, scale: 2 }).default('0'),
  source: varchar('source', { length: 100 }),
  status: varchar('status', { length: 20 }).default('new'), // new, contacted, qualified, lost
  managerId: integer('manager_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
});

export const uonManagers = pgTable('uon_managers', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id), // Привязка к команде для мультитенантности
  uonId: integer('uon_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  department: varchar('department', { length: 100 }),
  activeRequests: integer('active_requests').default(0),
  completedRequests: integer('completed_requests').default(0),
  totalSales: decimal('total_sales', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
});

export const uonCallHistory = pgTable('uon_call_history', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id), // Привязка к команде для мультитенантности
  uonId: integer('uon_id').notNull(),
  clientId: integer('client_id'),
  managerId: integer('manager_id'),
  direction: varchar('direction', { length: 20 }), // incoming, outgoing
  phone: varchar('phone', { length: 50 }),
  start: varchar('start', { length: 30 }), // дата и время начала звонка
  duration: integer('duration').default(0), // длительность в секундах
  recordLink: text('record_link'), // ссылка на запись разговора
  note: text('note'), // заметки по звонку
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
});

// Таблица для отслеживания синхронизации
export const uonSyncLog = pgTable('uon_sync_log', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id), // Привязка к команде для мультитенантности
  entityType: varchar('entity_type', { length: 50 }).notNull(), // tourists, requests, bills, etc.
  status: varchar('status', { length: 20 }).notNull(), // success, error, in_progress
  recordsProcessed: integer('records_processed').default(0),
  recordsUpdated: integer('records_updated').default(0),
  recordsCreated: integer('records_created').default(0),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // в секундах
});

// Таблицы для конструктора отчетов
export const reportTemplates = pgTable('report_templates', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id), // Привязка к команде для мультитенантности
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  chartType: varchar('chart_type', { length: 50 }).notNull(), // line, bar, pie, scatter, etc.
  dataSource: varchar('data_source', { length: 100 }).notNull(), // uon_requests, uon_calls, etc.
  config: text('config').notNull(), // JSON конфигурация ECharts
  filters: text('filters'), // JSON фильтры для данных
  isPublic: boolean('is_public').default(false), // Доступен ли шаблон другим пользователям команды
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id), // Привязка к команде для мультитенантности
  templateId: integer('template_id')
    .references(() => reportTemplates.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  chartType: varchar('chart_type', { length: 50 }).notNull(),
  dataSource: varchar('data_source', { length: 100 }).notNull(),
  config: text('config').notNull(), // JSON конфигурация ECharts
  filters: text('filters'), // JSON фильтры для данных
  dateRange: varchar('date_range', { length: 50 }), // last_7_days, last_month, custom, etc.
  customDateFrom: timestamp('custom_date_from'),
  customDateTo: timestamp('custom_date_to'),
  isScheduled: boolean('is_scheduled').default(false),
  scheduleFrequency: varchar('schedule_frequency', { length: 20 }), // daily, weekly, monthly
  lastGenerated: timestamp('last_generated'),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reportShares = pgTable('report_shares', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id')
    .notNull()
    .references(() => reports.id),
  sharedWith: integer('shared_with')
    .notNull()
    .references(() => users.id),
  permission: varchar('permission', { length: 20 }).notNull().default('view'), // view, edit
  sharedBy: integer('shared_by')
    .notNull()
    .references(() => users.id),
  sharedAt: timestamp('shared_at').notNull().defaultNow(),
});

// Relations для U-ON таблиц
export const uonTouristsRelations = relations(uonTourists, ({ many }) => ({
  // Можно добавить связи если понадобится
}));

export const uonRequestsRelations = relations(uonRequests, ({ many }) => ({
  bills: many(uonBills),
}));

export const uonBillsRelations = relations(uonBills, ({ one }) => ({
  request: one(uonRequests, {
    fields: [uonBills.requestId],
    references: [uonRequests.uonId],
  }),
}));

// Типы для U-ON данных
export type UonTourist = typeof uonTourists.$inferSelect;
export type NewUonTourist = typeof uonTourists.$inferInsert;
export type UonRequest = typeof uonRequests.$inferSelect;
export type NewUonRequest = typeof uonRequests.$inferInsert;
export type UonBill = typeof uonBills.$inferSelect;
export type NewUonBill = typeof uonBills.$inferInsert;
export type UonClient = typeof uonClients.$inferSelect;
export type NewUonClient = typeof uonClients.$inferInsert;
export type UonLead = typeof uonLeads.$inferSelect;
export type NewUonLead = typeof uonLeads.$inferInsert;
export type UonManager = typeof uonManagers.$inferSelect;
export type NewUonManager = typeof uonManagers.$inferInsert;
export type UonCallHistory = typeof uonCallHistory.$inferSelect;
export type NewUonCallHistory = typeof uonCallHistory.$inferInsert;
export type UonSyncLog = typeof uonSyncLog.$inferSelect;
export type NewUonSyncLog = typeof uonSyncLog.$inferInsert;

// ==================== amoCRM Integration Tables ====================

// Настройки интеграции с amoCRM
export const amoCrmSettings = pgTable('amocrm_settings', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id)
    .unique(), // Одна настройка на команду
  subdomain: varchar('subdomain', { length: 100 }).notNull(),
  clientId: varchar('client_id', { length: 255 }).notNull(),
  clientSecret: text('client_secret').notNull(),
  redirectUri: text('redirect_uri').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(false),
  syncEnabled: boolean('sync_enabled').default(false),
  syncInterval: integer('sync_interval').default(30), // минуты
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Конфигурация синхронизации
export const amoCrmSyncConfig = pgTable('amocrm_sync_config', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // tourists, requests, leads, calls
  direction: varchar('direction', { length: 20 }).notNull().default('uon_to_amo'), // uon_to_amo, amo_to_uon, bidirectional
  isEnabled: boolean('is_enabled').default(true),
  pipelineId: integer('pipeline_id'), // ID воронки в amoCRM для сделок
  statusMapping: text('status_mapping'), // JSON маппинг статусов
  fieldMapping: text('field_mapping'), // JSON маппинг полей
  createIfNotExists: boolean('create_if_not_exists').default(true),
  updateExisting: boolean('update_existing').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Маппинг сущностей U-ON <-> amoCRM
export const amoCrmEntityMapping = pgTable('amocrm_entity_mapping', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  uonEntityType: varchar('uon_entity_type', { length: 50 }).notNull(), // tourist, request, lead, call
  uonEntityId: integer('uon_entity_id').notNull(),
  amoEntityType: varchar('amo_entity_type', { length: 50 }).notNull(), // contact, lead, company, note
  amoEntityId: integer('amo_entity_id').notNull(),
  syncStatus: varchar('sync_status', { length: 20 }).default('synced'), // synced, pending, error
  lastSyncAt: timestamp('last_sync_at').notNull().defaultNow(),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Лог синхронизации с amoCRM
export const amoCrmSyncLog = pgTable('amocrm_sync_log', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  direction: varchar('direction', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // running, completed, failed
  recordsProcessed: integer('records_processed').default(0),
  recordsCreated: integer('records_created').default(0),
  recordsUpdated: integer('records_updated').default(0),
  recordsSkipped: integer('records_skipped').default(0),
  recordsFailed: integer('records_failed').default(0),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // в секундах
});

// Очередь синхронизации (для отложенной обработки)
export const amoCrmSyncQueue = pgTable('amocrm_sync_queue', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: integer('entity_id').notNull(),
  action: varchar('action', { length: 20 }).notNull(), // create, update, delete
  priority: integer('priority').default(0),
  status: varchar('status', { length: 20 }).default('pending'), // pending, processing, completed, failed
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  lastError: text('last_error'),
  scheduledAt: timestamp('scheduled_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Типы для amoCRM таблиц
export type AmoCrmSettings = typeof amoCrmSettings.$inferSelect;
export type NewAmoCrmSettings = typeof amoCrmSettings.$inferInsert;
export type AmoCrmSyncConfig = typeof amoCrmSyncConfig.$inferSelect;
export type NewAmoCrmSyncConfig = typeof amoCrmSyncConfig.$inferInsert;
export type AmoCrmEntityMapping = typeof amoCrmEntityMapping.$inferSelect;
export type NewAmoCrmEntityMapping = typeof amoCrmEntityMapping.$inferInsert;
export type AmoCrmSyncLog = typeof amoCrmSyncLog.$inferSelect;
export type NewAmoCrmSyncLog = typeof amoCrmSyncLog.$inferInsert;
export type AmoCrmSyncQueue = typeof amoCrmSyncQueue.$inferSelect;
export type NewAmoCrmSyncQueue = typeof amoCrmSyncQueue.$inferInsert;
