import { pgTable, foreignKey, serial, integer, varchar, text, timestamp, boolean, numeric, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const reports = pgTable("reports", {
	id: serial().primaryKey().notNull(),
	teamId: integer("team_id").notNull(),
	templateId: integer("template_id"),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	chartType: varchar("chart_type", { length: 50 }).notNull(),
	dataSource: varchar("data_source", { length: 100 }).notNull(),
	config: text().notNull(),
	filters: text(),
	dateRange: varchar("date_range", { length: 50 }),
	customDateFrom: timestamp("custom_date_from", { mode: 'string' }),
	customDateTo: timestamp("custom_date_to", { mode: 'string' }),
	isScheduled: boolean("is_scheduled").default(false),
	scheduleFrequency: varchar("schedule_frequency", { length: 20 }),
	lastGenerated: timestamp("last_generated", { mode: 'string' }),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "reports_team_id_teams_id_fk"
		}),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [reportTemplates.id],
			name: "reports_template_id_report_templates_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "reports_created_by_users_id_fk"
		}),
]);

export const reportShares = pgTable("report_shares", {
	id: serial().primaryKey().notNull(),
	reportId: integer("report_id").notNull(),
	sharedWith: integer("shared_with").notNull(),
	permission: varchar({ length: 20 }).default('view').notNull(),
	sharedBy: integer("shared_by").notNull(),
	sharedAt: timestamp("shared_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reportId],
			foreignColumns: [reports.id],
			name: "report_shares_report_id_reports_id_fk"
		}),
	foreignKey({
			columns: [table.sharedWith],
			foreignColumns: [users.id],
			name: "report_shares_shared_with_users_id_fk"
		}),
	foreignKey({
			columns: [table.sharedBy],
			foreignColumns: [users.id],
			name: "report_shares_shared_by_users_id_fk"
		}),
]);

export const reportTemplates = pgTable("report_templates", {
	id: serial().primaryKey().notNull(),
	teamId: integer("team_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	chartType: varchar("chart_type", { length: 50 }).notNull(),
	dataSource: varchar("data_source", { length: 100 }).notNull(),
	config: text().notNull(),
	filters: text(),
	isPublic: boolean("is_public").default(false),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "report_templates_team_id_teams_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "report_templates_created_by_users_id_fk"
		}),
]);

export const uonBills = pgTable("uon_bills", {
	id: serial().primaryKey().notNull(),
	uonId: integer("uon_id").notNull(),
	requestId: integer("request_id"),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: varchar({ length: 10 }).default('RUB'),
	status: varchar({ length: 20 }).default('pending'),
	paidAt: varchar("paid_at", { length: 30 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }).defaultNow().notNull(),
	teamId: integer("team_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "uon_bills_team_id_teams_id_fk"
		}),
]);

export const uonCallHistory = pgTable("uon_call_history", {
	id: serial().primaryKey().notNull(),
	uonId: integer("uon_id").notNull(),
	clientId: integer("client_id"),
	managerId: integer("manager_id"),
	direction: varchar({ length: 20 }),
	phone: varchar({ length: 50 }),
	start: varchar({ length: 30 }),
	duration: integer().default(0),
	recordLink: text("record_link"),
	note: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }).defaultNow().notNull(),
	teamId: integer("team_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "uon_call_history_team_id_teams_id_fk"
		}),
]);

export const uonClients = pgTable("uon_clients", {
	id: serial().primaryKey().notNull(),
	uonId: integer("uon_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	country: varchar({ length: 100 }),
	totalSpent: numeric("total_spent", { precision: 12, scale:  2 }).default('0'),
	requestsCount: integer("requests_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }).defaultNow().notNull(),
	teamId: integer("team_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "uon_clients_team_id_teams_id_fk"
		}),
]);

export const uonLeads = pgTable("uon_leads", {
	id: serial().primaryKey().notNull(),
	uonId: integer("uon_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	countryInterest: varchar("country_interest", { length: 100 }),
	budget: numeric({ precision: 12, scale:  2 }).default('0'),
	source: varchar({ length: 100 }),
	status: varchar({ length: 20 }).default('new'),
	managerId: integer("manager_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }).defaultNow().notNull(),
	teamId: integer("team_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "uon_leads_team_id_teams_id_fk"
		}),
]);

export const uonManagers = pgTable("uon_managers", {
	id: serial().primaryKey().notNull(),
	uonId: integer("uon_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	department: varchar({ length: 100 }),
	activeRequests: integer("active_requests").default(0),
	completedRequests: integer("completed_requests").default(0),
	totalSales: numeric("total_sales", { precision: 12, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }).defaultNow().notNull(),
	teamId: integer("team_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "uon_managers_team_id_teams_id_fk"
		}),
]);

export const uonRequests = pgTable("uon_requests", {
	id: serial().primaryKey().notNull(),
	uonId: integer("uon_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	country: varchar({ length: 100 }),
	city: varchar({ length: 100 }),
	departureDate: varchar("departure_date", { length: 20 }),
	returnDate: varchar("return_date", { length: 20 }),
	adults: integer().default(0),
	children: integer().default(0),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }).default('0'),
	status: varchar({ length: 20 }).default('new'),
	managerId: integer("manager_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }).defaultNow().notNull(),
	teamId: integer("team_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "uon_requests_team_id_teams_id_fk"
		}),
]);

export const teams = pgTable("teams", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	stripeProductId: text("stripe_product_id"),
	planName: varchar("plan_name", { length: 50 }),
	subscriptionStatus: varchar("subscription_status", { length: 20 }),
}, (table) => [
	unique("teams_stripe_customer_id_unique").on(table.stripeCustomerId),
	unique("teams_stripe_subscription_id_unique").on(table.stripeSubscriptionId),
]);

export const activityLogs = pgTable("activity_logs", {
	id: serial().primaryKey().notNull(),
	teamId: integer("team_id").notNull(),
	userId: integer("user_id"),
	action: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "activity_logs_team_id_teams_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activity_logs_user_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: text("password_hash").notNull(),
	role: varchar({ length: 20 }).default('member').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const invitations = pgTable("invitations", {
	id: serial().primaryKey().notNull(),
	teamId: integer("team_id").notNull(),
	email: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 50 }).notNull(),
	invitedBy: integer("invited_by").notNull(),
	invitedAt: timestamp("invited_at", { mode: 'string' }).defaultNow().notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "invitations_team_id_teams_id_fk"
		}),
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [users.id],
			name: "invitations_invited_by_users_id_fk"
		}),
]);

export const teamMembers = pgTable("team_members", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	teamId: integer("team_id").notNull(),
	role: varchar({ length: 50 }).notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "team_members_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "team_members_team_id_teams_id_fk"
		}),
]);

export const uonSyncLog = pgTable("uon_sync_log", {
	id: serial().primaryKey().notNull(),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	status: varchar({ length: 20 }).notNull(),
	recordsProcessed: integer("records_processed").default(0),
	recordsUpdated: integer("records_updated").default(0),
	recordsCreated: integer("records_created").default(0),
	errorMessage: text("error_message"),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	duration: integer(),
	teamId: integer("team_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "uon_sync_log_team_id_teams_id_fk"
		}),
]);

export const uonTourists = pgTable("uon_tourists", {
	id: serial().primaryKey().notNull(),
	uonId: integer("uon_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	country: varchar({ length: 100 }),
	city: varchar({ length: 100 }),
	birthDate: varchar("birth_date", { length: 20 }),
	passportNumber: varchar("passport_number", { length: 50 }),
	lastTripDate: varchar("last_trip_date", { length: 20 }),
	totalTrips: integer("total_trips").default(0),
	totalSpent: numeric("total_spent", { precision: 12, scale:  2 }).default('0'),
	status: varchar({ length: 20 }).default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }).defaultNow().notNull(),
	teamId: integer("team_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "uon_tourists_team_id_teams_id_fk"
		}),
]);
