import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_marketplaces_country" AS ENUM('NL', 'BE', 'LU', 'DE', 'AT', 'FR', 'IT', 'ES', 'PT', 'IE', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'RO', 'BG', 'GR', 'CY', 'MT', 'DK', 'SE', 'FI', 'EE', 'LV', 'LT', 'GB');
  CREATE TYPE "public"."enum_marketplaces_mode" AS ENUM('http', 'browser');
  ALTER TYPE "public"."enum_saved_searches_sources" ADD VALUE 'willhaben' BEFORE 'subito';
  ALTER TYPE "public"."enum_saved_searches_sources" ADD VALUE 'olx' BEFORE 'subito';
  ALTER TYPE "public"."enum_saved_searches_sources" ADD VALUE 'bazos' BEFORE 'subito';
  ALTER TYPE "public"."enum_saved_searches_sources" ADD VALUE 'other';
  ALTER TYPE "public"."enum_listings_source" ADD VALUE 'willhaben' BEFORE 'subito';
  ALTER TYPE "public"."enum_listings_source" ADD VALUE 'olx' BEFORE 'subito';
  ALTER TYPE "public"."enum_listings_source" ADD VALUE 'bazos' BEFORE 'subito';
  ALTER TYPE "public"."enum_listings_source" ADD VALUE 'other';
  ALTER TYPE "public"."enum_settings_enabled_deal_sources" ADD VALUE 'willhaben' BEFORE 'subito';
  ALTER TYPE "public"."enum_settings_enabled_deal_sources" ADD VALUE 'olx' BEFORE 'subito';
  ALTER TYPE "public"."enum_settings_enabled_deal_sources" ADD VALUE 'bazos' BEFORE 'subito';
  ALTER TYPE "public"."enum_settings_enabled_deal_sources" ADD VALUE 'other';
  ALTER TYPE "public"."enum_settings_permitted_deal_sources" ADD VALUE 'willhaben' BEFORE 'subito';
  ALTER TYPE "public"."enum_settings_permitted_deal_sources" ADD VALUE 'olx' BEFORE 'subito';
  ALTER TYPE "public"."enum_settings_permitted_deal_sources" ADD VALUE 'bazos' BEFORE 'subito';
  CREATE TABLE "marketplaces" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"country" "enum_marketplaces_country" NOT NULL,
  	"currency" varchar DEFAULT 'EUR' NOT NULL,
  	"search_url" varchar NOT NULL,
  	"mode" "enum_marketplaces_mode" DEFAULT 'http' NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"permitted" boolean DEFAULT false,
  	"notes" varchar,
  	"last_run_at" timestamp(3) with time zone,
  	"last_result" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "saved_searches_countries" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_saved_searches_countries";
  CREATE TYPE "public"."enum_saved_searches_countries" AS ENUM('NL', 'BE', 'LU', 'DE', 'AT', 'FR', 'IT', 'ES', 'PT', 'IE', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'RO', 'BG', 'GR', 'CY', 'MT', 'DK', 'SE', 'FI', 'EE', 'LV', 'LT', 'GB');
  ALTER TABLE "saved_searches_countries" ALTER COLUMN "value" SET DATA TYPE "public"."enum_saved_searches_countries" USING "value"::"public"."enum_saved_searches_countries";
  ALTER TABLE "listings" ADD COLUMN "marketplace" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "marketplaces_id" integer;
  CREATE UNIQUE INDEX "marketplaces_slug_idx" ON "marketplaces" USING btree ("slug");
  CREATE INDEX "marketplaces_updated_at_idx" ON "marketplaces" USING btree ("updated_at");
  CREATE INDEX "marketplaces_created_at_idx" ON "marketplaces" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_marketplaces_fk" FOREIGN KEY ("marketplaces_id") REFERENCES "public"."marketplaces"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_marketplaces_id_idx" ON "payload_locked_documents_rels" USING btree ("marketplaces_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "marketplaces" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "marketplaces" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_marketplaces_fk";
  
  ALTER TABLE "saved_searches_countries" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_saved_searches_countries";
  CREATE TYPE "public"."enum_saved_searches_countries" AS ENUM('NL', 'BE', 'DE', 'AT', 'FR', 'IT', 'ES', 'PT', 'PL', 'CZ', 'DK', 'SE', 'IE', 'GB');
  ALTER TABLE "saved_searches_countries" ALTER COLUMN "value" SET DATA TYPE "public"."enum_saved_searches_countries" USING "value"::"public"."enum_saved_searches_countries";
  ALTER TABLE "saved_searches_sources" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_saved_searches_sources";
  CREATE TYPE "public"."enum_saved_searches_sources" AS ENUM('ebay', 'marktplaats', 'kleinanzeigen', 'subito', 'wallapop', 'milanuncios', 'leboncoin', 'vinted');
  ALTER TABLE "saved_searches_sources" ALTER COLUMN "value" SET DATA TYPE "public"."enum_saved_searches_sources" USING "value"::"public"."enum_saved_searches_sources";
  ALTER TABLE "listings" ALTER COLUMN "source" SET DATA TYPE text;
  DROP TYPE "public"."enum_listings_source";
  CREATE TYPE "public"."enum_listings_source" AS ENUM('ebay', 'marktplaats', 'kleinanzeigen', 'subito', 'wallapop', 'milanuncios', 'leboncoin', 'vinted');
  ALTER TABLE "listings" ALTER COLUMN "source" SET DATA TYPE "public"."enum_listings_source" USING "source"::"public"."enum_listings_source";
  ALTER TABLE "settings_enabled_deal_sources" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_settings_enabled_deal_sources";
  CREATE TYPE "public"."enum_settings_enabled_deal_sources" AS ENUM('ebay', 'marktplaats', 'kleinanzeigen', 'subito', 'wallapop', 'leboncoin', 'vinted');
  ALTER TABLE "settings_enabled_deal_sources" ALTER COLUMN "value" SET DATA TYPE "public"."enum_settings_enabled_deal_sources" USING "value"::"public"."enum_settings_enabled_deal_sources";
  ALTER TABLE "settings_permitted_deal_sources" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_settings_permitted_deal_sources";
  CREATE TYPE "public"."enum_settings_permitted_deal_sources" AS ENUM('marktplaats', 'kleinanzeigen', 'subito', 'wallapop', 'leboncoin', 'vinted');
  ALTER TABLE "settings_permitted_deal_sources" ALTER COLUMN "value" SET DATA TYPE "public"."enum_settings_permitted_deal_sources" USING "value"::"public"."enum_settings_permitted_deal_sources";
  DROP INDEX "payload_locked_documents_rels_marketplaces_id_idx";
  ALTER TABLE "listings" DROP COLUMN "marketplace";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "marketplaces_id";
  DROP TYPE "public"."enum_marketplaces_country";
  DROP TYPE "public"."enum_marketplaces_mode";`)
}
