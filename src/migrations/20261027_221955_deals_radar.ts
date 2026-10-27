import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_settings_enabled_deal_sources" AS ENUM('ebay', 'marktplaats', 'kleinanzeigen');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'runDeals';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'fetchFxRates';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'runDeals';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'fetchFxRates';
  CREATE TABLE "fx_rates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"currency" varchar NOT NULL,
  	"rate" numeric NOT NULL,
  	"date" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "settings_enabled_deal_sources" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_settings_enabled_deal_sources",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "saved_searches" ADD COLUMN "exclude_keywords" varchar;
  ALTER TABLE "saved_searches" ADD COLUMN "last_result" varchar;
  ALTER TABLE "users" ADD COLUMN "deals_seen_before" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "fx_rates_id" integer;
  ALTER TABLE "settings_enabled_deal_sources" ADD CONSTRAINT "settings_enabled_deal_sources_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "fx_rates_currency_idx" ON "fx_rates" USING btree ("currency");
  CREATE INDEX "fx_rates_updated_at_idx" ON "fx_rates" USING btree ("updated_at");
  CREATE INDEX "fx_rates_created_at_idx" ON "fx_rates" USING btree ("created_at");
  CREATE INDEX "settings_enabled_deal_sources_order_idx" ON "settings_enabled_deal_sources" USING btree ("order");
  CREATE INDEX "settings_enabled_deal_sources_parent_idx" ON "settings_enabled_deal_sources" USING btree ("parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fx_rates_fk" FOREIGN KEY ("fx_rates_id") REFERENCES "public"."fx_rates"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_fx_rates_id_idx" ON "payload_locked_documents_rels" USING btree ("fx_rates_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "fx_rates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "settings_enabled_deal_sources" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "fx_rates" CASCADE;
  DROP TABLE "settings_enabled_deal_sources" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_fx_rates_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'fetchNews');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'fetchNews');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_fx_rates_id_idx";
  ALTER TABLE "saved_searches" DROP COLUMN "exclude_keywords";
  ALTER TABLE "saved_searches" DROP COLUMN "last_result";
  ALTER TABLE "users" DROP COLUMN "deals_seen_before";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "fx_rates_id";
  DROP TYPE "public"."enum_settings_enabled_deal_sources";`)
}
