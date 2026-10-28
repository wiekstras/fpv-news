import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_listings_availability" AS ENUM('available', 'gone');
  CREATE TYPE "public"."enum_settings_home_country" AS ENUM('NL', 'BE', 'LU', 'DE', 'AT', 'FR', 'IT', 'ES', 'PT', 'IE', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'RO', 'BG', 'GR', 'CY', 'MT', 'DK', 'SE', 'FI', 'EE', 'LV', 'LT', 'GB');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'checkListings' BEFORE 'prepareDigest';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'checkListings' BEFORE 'prepareDigest';
  CREATE TABLE "source_health" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"last_success_at" timestamp(3) with time zone,
  	"last_found" numeric,
  	"last_failure_at" timestamp(3) with time zone,
  	"last_error" varchar,
  	"consecutive_failures" numeric DEFAULT 0,
  	"paused" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "geo_cache" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"lat" numeric,
  	"lon" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "saved_searches" ADD COLUMN "run_every_hours" numeric DEFAULT 3;
  ALTER TABLE "saved_searches" ADD COLUMN "max_distance_km" numeric;
  ALTER TABLE "listings" ADD COLUMN "last_seen_at" timestamp(3) with time zone;
  ALTER TABLE "listings" ADD COLUMN "availability" "enum_listings_availability" DEFAULT 'available';
  ALTER TABLE "listings" ADD COLUMN "gone_at" timestamp(3) with time zone;
  ALTER TABLE "listings" ADD COLUMN "price_history" jsonb;
  ALTER TABLE "listings" ADD COLUMN "duplicate_of_id" integer;
  ALTER TABLE "listings" ADD COLUMN "warning" varchar;
  ALTER TABLE "listings" ADD COLUMN "seller_rating" varchar;
  ALTER TABLE "listings" ADD COLUMN "lat" numeric;
  ALTER TABLE "listings" ADD COLUMN "lon" numeric;
  ALTER TABLE "listings" ADD COLUMN "distance_km" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "source_health_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "geo_cache_id" integer;
  ALTER TABLE "settings" ADD COLUMN "home_location" varchar;
  ALTER TABLE "settings" ADD COLUMN "home_country" "enum_settings_home_country" DEFAULT 'NL';
  ALTER TABLE "settings" ADD COLUMN "home_lat" numeric;
  ALTER TABLE "settings" ADD COLUMN "home_lon" numeric;
  CREATE UNIQUE INDEX "source_health_key_idx" ON "source_health" USING btree ("key");
  CREATE INDEX "source_health_updated_at_idx" ON "source_health" USING btree ("updated_at");
  CREATE INDEX "source_health_created_at_idx" ON "source_health" USING btree ("created_at");
  CREATE UNIQUE INDEX "geo_cache_key_idx" ON "geo_cache" USING btree ("key");
  CREATE INDEX "geo_cache_updated_at_idx" ON "geo_cache" USING btree ("updated_at");
  CREATE INDEX "geo_cache_created_at_idx" ON "geo_cache" USING btree ("created_at");
  ALTER TABLE "listings" ADD CONSTRAINT "listings_duplicate_of_id_listings_id_fk" FOREIGN KEY ("duplicate_of_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_source_health_fk" FOREIGN KEY ("source_health_id") REFERENCES "public"."source_health"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_geo_cache_fk" FOREIGN KEY ("geo_cache_id") REFERENCES "public"."geo_cache"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "listings_availability_idx" ON "listings" USING btree ("availability");
  CREATE INDEX "listings_duplicate_of_idx" ON "listings" USING btree ("duplicate_of_id");
  CREATE INDEX "listings_distance_km_idx" ON "listings" USING btree ("distance_km");
  CREATE INDEX "payload_locked_documents_rels_source_health_id_idx" ON "payload_locked_documents_rels" USING btree ("source_health_id");
  CREATE INDEX "payload_locked_documents_rels_geo_cache_id_idx" ON "payload_locked_documents_rels" USING btree ("geo_cache_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "source_health" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "geo_cache" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "source_health" CASCADE;
  DROP TABLE "geo_cache" CASCADE;
  ALTER TABLE "listings" DROP CONSTRAINT "listings_duplicate_of_id_listings_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_source_health_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_geo_cache_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'fetchNews', 'runDeals', 'fetchFxRates', 'prepareDigest');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'fetchNews', 'runDeals', 'fetchFxRates', 'prepareDigest');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "listings_availability_idx";
  DROP INDEX "listings_duplicate_of_idx";
  DROP INDEX "listings_distance_km_idx";
  DROP INDEX "payload_locked_documents_rels_source_health_id_idx";
  DROP INDEX "payload_locked_documents_rels_geo_cache_id_idx";
  ALTER TABLE "saved_searches" DROP COLUMN "run_every_hours";
  ALTER TABLE "saved_searches" DROP COLUMN "max_distance_km";
  ALTER TABLE "listings" DROP COLUMN "last_seen_at";
  ALTER TABLE "listings" DROP COLUMN "availability";
  ALTER TABLE "listings" DROP COLUMN "gone_at";
  ALTER TABLE "listings" DROP COLUMN "price_history";
  ALTER TABLE "listings" DROP COLUMN "duplicate_of_id";
  ALTER TABLE "listings" DROP COLUMN "warning";
  ALTER TABLE "listings" DROP COLUMN "seller_rating";
  ALTER TABLE "listings" DROP COLUMN "lat";
  ALTER TABLE "listings" DROP COLUMN "lon";
  ALTER TABLE "listings" DROP COLUMN "distance_km";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "source_health_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "geo_cache_id";
  ALTER TABLE "settings" DROP COLUMN "home_location";
  ALTER TABLE "settings" DROP COLUMN "home_country";
  ALTER TABLE "settings" DROP COLUMN "home_lat";
  ALTER TABLE "settings" DROP COLUMN "home_lon";
  DROP TYPE "public"."enum_listings_availability";
  DROP TYPE "public"."enum_settings_home_country";`)
}
