CREATE TABLE "yandex_cloud_sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"operation_type" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"status" varchar(20) NOT NULL,
	"records_exported" integer DEFAULT 0,
	"file_key" text,
	"file_size" integer DEFAULT 0,
	"backup_id" varchar(100),
	"error_message" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration" integer
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "yandex_cloud_folder_id" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "yandex_cloud_access_key_id" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "yandex_cloud_secret_access_key" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "yandex_cloud_bucket" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "yandex_cloud_oauth_token" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "yandex_cloud_auto_backup" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "yandex_cloud_backup_frequency" varchar(20);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "yandex_cloud_last_backup" timestamp;--> statement-breakpoint
ALTER TABLE "yandex_cloud_sync_log" ADD CONSTRAINT "yandex_cloud_sync_log_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;