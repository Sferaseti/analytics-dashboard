CREATE TABLE "report_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"shared_with" integer NOT NULL,
	"permission" varchar(20) DEFAULT 'view' NOT NULL,
	"shared_by" integer NOT NULL,
	"shared_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"chart_type" varchar(50) NOT NULL,
	"data_source" varchar(100) NOT NULL,
	"config" text NOT NULL,
	"filters" text,
	"is_public" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"template_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"chart_type" varchar(50) NOT NULL,
	"data_source" varchar(100) NOT NULL,
	"config" text NOT NULL,
	"filters" text,
	"date_range" varchar(50),
	"custom_date_from" timestamp,
	"custom_date_to" timestamp,
	"is_scheduled" boolean DEFAULT false,
	"schedule_frequency" varchar(20),
	"last_generated" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uon_bills" DROP CONSTRAINT "uon_bills_uon_id_unique";--> statement-breakpoint
ALTER TABLE "uon_call_history" DROP CONSTRAINT "uon_call_history_uon_id_unique";--> statement-breakpoint
ALTER TABLE "uon_clients" DROP CONSTRAINT "uon_clients_uon_id_unique";--> statement-breakpoint
ALTER TABLE "uon_leads" DROP CONSTRAINT "uon_leads_uon_id_unique";--> statement-breakpoint
ALTER TABLE "uon_managers" DROP CONSTRAINT "uon_managers_uon_id_unique";--> statement-breakpoint
ALTER TABLE "uon_requests" DROP CONSTRAINT "uon_requests_uon_id_unique";--> statement-breakpoint
ALTER TABLE "uon_tourists" DROP CONSTRAINT "uon_tourists_uon_id_unique";--> statement-breakpoint

-- Add team_id columns as nullable first
ALTER TABLE "uon_bills" ADD COLUMN "team_id" integer;--> statement-breakpoint
ALTER TABLE "uon_call_history" ADD COLUMN "team_id" integer;--> statement-breakpoint
ALTER TABLE "uon_clients" ADD COLUMN "team_id" integer;--> statement-breakpoint
ALTER TABLE "uon_leads" ADD COLUMN "team_id" integer;--> statement-breakpoint
ALTER TABLE "uon_managers" ADD COLUMN "team_id" integer;--> statement-breakpoint
ALTER TABLE "uon_requests" ADD COLUMN "team_id" integer;--> statement-breakpoint
ALTER TABLE "uon_sync_log" ADD COLUMN "team_id" integer;--> statement-breakpoint
ALTER TABLE "uon_tourists" ADD COLUMN "team_id" integer;--> statement-breakpoint

-- Update existing records to assign them to team 1 (default team)
UPDATE "uon_bills" SET "team_id" = 1 WHERE "team_id" IS NULL;--> statement-breakpoint
UPDATE "uon_call_history" SET "team_id" = 1 WHERE "team_id" IS NULL;--> statement-breakpoint
UPDATE "uon_clients" SET "team_id" = 1 WHERE "team_id" IS NULL;--> statement-breakpoint
UPDATE "uon_leads" SET "team_id" = 1 WHERE "team_id" IS NULL;--> statement-breakpoint
UPDATE "uon_managers" SET "team_id" = 1 WHERE "team_id" IS NULL;--> statement-breakpoint
UPDATE "uon_requests" SET "team_id" = 1 WHERE "team_id" IS NULL;--> statement-breakpoint
UPDATE "uon_sync_log" SET "team_id" = 1 WHERE "team_id" IS NULL;--> statement-breakpoint
UPDATE "uon_tourists" SET "team_id" = 1 WHERE "team_id" IS NULL;--> statement-breakpoint

-- Now make team_id columns NOT NULL
ALTER TABLE "uon_bills" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "uon_call_history" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "uon_clients" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "uon_leads" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "uon_managers" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "uon_requests" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "uon_sync_log" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "uon_tourists" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_shared_with_users_id_fk" FOREIGN KEY ("shared_with") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_shared_by_users_id_fk" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uon_bills" ADD CONSTRAINT "uon_bills_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uon_call_history" ADD CONSTRAINT "uon_call_history_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uon_clients" ADD CONSTRAINT "uon_clients_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uon_leads" ADD CONSTRAINT "uon_leads_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uon_managers" ADD CONSTRAINT "uon_managers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uon_requests" ADD CONSTRAINT "uon_requests_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uon_sync_log" ADD CONSTRAINT "uon_sync_log_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uon_tourists" ADD CONSTRAINT "uon_tourists_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;