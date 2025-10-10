import { relations } from "drizzle-orm/relations";
import { teams, reports, reportTemplates, users, reportShares, uonBills, uonCallHistory, uonClients, uonLeads, uonManagers, uonRequests, activityLogs, invitations, teamMembers, uonSyncLog, uonTourists } from "./schema";

export const reportsRelations = relations(reports, ({one, many}) => ({
	team: one(teams, {
		fields: [reports.teamId],
		references: [teams.id]
	}),
	reportTemplate: one(reportTemplates, {
		fields: [reports.templateId],
		references: [reportTemplates.id]
	}),
	user: one(users, {
		fields: [reports.createdBy],
		references: [users.id]
	}),
	reportShares: many(reportShares),
}));

export const teamsRelations = relations(teams, ({many}) => ({
	reports: many(reports),
	reportTemplates: many(reportTemplates),
	uonBills: many(uonBills),
	uonCallHistories: many(uonCallHistory),
	uonClients: many(uonClients),
	uonLeads: many(uonLeads),
	uonManagers: many(uonManagers),
	uonRequests: many(uonRequests),
	activityLogs: many(activityLogs),
	invitations: many(invitations),
	teamMembers: many(teamMembers),
	uonSyncLogs: many(uonSyncLog),
	uonTourists: many(uonTourists),
}));

export const reportTemplatesRelations = relations(reportTemplates, ({one, many}) => ({
	reports: many(reports),
	team: one(teams, {
		fields: [reportTemplates.teamId],
		references: [teams.id]
	}),
	user: one(users, {
		fields: [reportTemplates.createdBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	reports: many(reports),
	reportShares_sharedWith: many(reportShares, {
		relationName: "reportShares_sharedWith_users_id"
	}),
	reportShares_sharedBy: many(reportShares, {
		relationName: "reportShares_sharedBy_users_id"
	}),
	reportTemplates: many(reportTemplates),
	activityLogs: many(activityLogs),
	invitations: many(invitations),
	teamMembers: many(teamMembers),
}));

export const reportSharesRelations = relations(reportShares, ({one}) => ({
	report: one(reports, {
		fields: [reportShares.reportId],
		references: [reports.id]
	}),
	user_sharedWith: one(users, {
		fields: [reportShares.sharedWith],
		references: [users.id],
		relationName: "reportShares_sharedWith_users_id"
	}),
	user_sharedBy: one(users, {
		fields: [reportShares.sharedBy],
		references: [users.id],
		relationName: "reportShares_sharedBy_users_id"
	}),
}));

export const uonBillsRelations = relations(uonBills, ({one}) => ({
	team: one(teams, {
		fields: [uonBills.teamId],
		references: [teams.id]
	}),
}));

export const uonCallHistoryRelations = relations(uonCallHistory, ({one}) => ({
	team: one(teams, {
		fields: [uonCallHistory.teamId],
		references: [teams.id]
	}),
}));

export const uonClientsRelations = relations(uonClients, ({one}) => ({
	team: one(teams, {
		fields: [uonClients.teamId],
		references: [teams.id]
	}),
}));

export const uonLeadsRelations = relations(uonLeads, ({one}) => ({
	team: one(teams, {
		fields: [uonLeads.teamId],
		references: [teams.id]
	}),
}));

export const uonManagersRelations = relations(uonManagers, ({one}) => ({
	team: one(teams, {
		fields: [uonManagers.teamId],
		references: [teams.id]
	}),
}));

export const uonRequestsRelations = relations(uonRequests, ({one}) => ({
	team: one(teams, {
		fields: [uonRequests.teamId],
		references: [teams.id]
	}),
}));

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	team: one(teams, {
		fields: [activityLogs.teamId],
		references: [teams.id]
	}),
	user: one(users, {
		fields: [activityLogs.userId],
		references: [users.id]
	}),
}));

export const invitationsRelations = relations(invitations, ({one}) => ({
	team: one(teams, {
		fields: [invitations.teamId],
		references: [teams.id]
	}),
	user: one(users, {
		fields: [invitations.invitedBy],
		references: [users.id]
	}),
}));

export const teamMembersRelations = relations(teamMembers, ({one}) => ({
	user: one(users, {
		fields: [teamMembers.userId],
		references: [users.id]
	}),
	team: one(teams, {
		fields: [teamMembers.teamId],
		references: [teams.id]
	}),
}));

export const uonSyncLogRelations = relations(uonSyncLog, ({one}) => ({
	team: one(teams, {
		fields: [uonSyncLog.teamId],
		references: [teams.id]
	}),
}));

export const uonTouristsRelations = relations(uonTourists, ({one}) => ({
	team: one(teams, {
		fields: [uonTourists.teamId],
		references: [teams.id]
	}),
}));