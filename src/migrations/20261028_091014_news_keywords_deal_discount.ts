import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sources" ADD COLUMN "require_keywords" varchar;
  ALTER TABLE "saved_searches" ADD COLUMN "reference_price" numeric;
  ALTER TABLE "saved_searches" ADD COLUMN "alert_discount" numeric;
  ALTER TABLE "saved_searches" ADD COLUMN "market_price" numeric;
  ALTER TABLE "saved_searches" ADD COLUMN "market_price_count" numeric;
  ALTER TABLE "saved_searches" ADD COLUMN "market_price_at" timestamp(3) with time zone;
  ALTER TABLE "listings" ADD COLUMN "reference_price" numeric;
  ALTER TABLE "listings" ADD COLUMN "discount_pct" numeric;
  CREATE INDEX "listings_discount_pct_idx" ON "listings" USING btree ("discount_pct");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "listings_discount_pct_idx";
  ALTER TABLE "sources" DROP COLUMN "require_keywords";
  ALTER TABLE "saved_searches" DROP COLUMN "reference_price";
  ALTER TABLE "saved_searches" DROP COLUMN "alert_discount";
  ALTER TABLE "saved_searches" DROP COLUMN "market_price";
  ALTER TABLE "saved_searches" DROP COLUMN "market_price_count";
  ALTER TABLE "saved_searches" DROP COLUMN "market_price_at";
  ALTER TABLE "listings" DROP COLUMN "reference_price";
  ALTER TABLE "listings" DROP COLUMN "discount_pct";`)
}
