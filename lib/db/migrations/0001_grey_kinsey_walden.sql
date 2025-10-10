CREATE TABLE "uon_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"uon_id" integer NOT NULL,
	"request_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'RUB',
	"status" varchar(20) DEFAULT 'pending',
	"paid_at" varchar(30),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uon_bills_uon_id_unique" UNIQUE("uon_id")
);
--> statement-breakpoint
CREATE TABLE "uon_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"uon_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"country" varchar(100),
	"total_spent" numeric(12, 2) DEFAULT '0',
	"requests_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uon_clients_uon_id_unique" UNIQUE("uon_id")
);
--> statement-breakpoint
CREATE TABLE "uon_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"uon_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"country_interest" varchar(100),
	"budget" numeric(12, 2) DEFAULT '0',
	"source" varchar(100),
	"status" varchar(20) DEFAULT 'new',
	"manager_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uon_leads_uon_id_unique" UNIQUE("uon_id")
);
--> statement-breakpoint
CREATE TABLE "uon_managers" (
	"id" serial PRIMARY KEY NOT NULL,
	"uon_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"department" varchar(100),
	"active_requests" integer DEFAULT 0,
	"completed_requests" integer DEFAULT 0,
	"total_sales" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uon_managers_uon_id_unique" UNIQUE("uon_id")
);
--> statement-breakpoint
CREATE TABLE "uon_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"uon_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"country" varchar(100),
	"city" varchar(100),
	"departure_date" varchar(20),
	"return_date" varchar(20),
	"adults" integer DEFAULT 0,
	"children" integer DEFAULT 0,
	"total_amount" numeric(12, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'new',
	"manager_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uon_requests_uon_id_unique" UNIQUE("uon_id")
);
--> statement-breakpoint
CREATE TABLE "uon_sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"records_created" integer DEFAULT 0,
	"error_message" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration" integer
);
--> statement-breakpoint
CREATE TABLE "uon_tourists" (
	"id" serial PRIMARY KEY NOT NULL,
	"uon_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"country" varchar(100),
	"city" varchar(100),
	"birth_date" varchar(20),
	"passport_number" varchar(50),
	"last_trip_date" varchar(20),
	"total_trips" integer DEFAULT 0,
	"total_spent" numeric(12, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uon_tourists_uon_id_unique" UNIQUE("uon_id")
);
