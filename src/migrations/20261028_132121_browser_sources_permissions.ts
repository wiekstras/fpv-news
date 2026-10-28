import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_settings_permitted_deal_sources" AS ENUM('marktplaats', 'kleinanzeigen', 'subito', 'wallapop', 'leboncoin', 'vinted');
  ALTER TYPE "public"."enum_settings_enabled_deal_sources" ADD VALUE 'subito';
  ALTER TYPE "public"."enum_settings_enabled_deal_sources" ADD VALUE 'wallapop';
  ALTER TYPE "public"."enum_settings_enabled_deal_sources" ADD VALUE 'leboncoin';
  ALTER TYPE "public"."enum_settings_enabled_deal_sources" ADD VALUE 'vinted';
  CREATE TABLE "settings_permitted_deal_sources" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_settings_permitted_deal_sources",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "settings_permitted_deal_sources" ADD CONSTRAINT "settings_permitted_deal_sources_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "settings_permitted_deal_sources_order_idx" ON "settings_permitted_deal_sources" USING btree ("order");
  CREATE INDEX "settings_permitted_deal_sources_parent_idx" ON "settings_permitted_deal_sources" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "settings_permitted_deal_sources" CASCADE;
  ALTER TABLE "settings_enabled_deal_sources" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_settings_enabled_deal_sources";
  CREATE TYPE "public"."enum_settings_enabled_deal_sources" AS ENUM('ebay', 'marktplaats', 'kleinanzeigen');
  ALTER TABLE "settings_enabled_deal_sources" ALTER COLUMN "value" SET DATA TYPE "public"."enum_settings_enabled_deal_sources" USING "value"::"public"."enum_settings_enabled_deal_sources";
  DROP TYPE "public"."enum_settings_permitted_deal_sources";`)
}
