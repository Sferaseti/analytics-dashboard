CREATE TABLE "uon_call_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"uon_id" integer NOT NULL,
	"client_id" integer,
	"manager_id" integer,
	"direction" varchar(20),
	"phone" varchar(50),
	"start" varchar(30),
	"duration" integer DEFAULT 0,
	"record_link" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uon_call_history_uon_id_unique" UNIQUE("uon_id")
);
