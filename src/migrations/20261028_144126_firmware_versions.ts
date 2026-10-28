import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sources" ADD COLUMN "stable_version" varchar;
  ALTER TABLE "sources" ADD COLUMN "stable_url" varchar;
  ALTER TABLE "sources" ADD COLUMN "stable_date" timestamp(3) with time zone;
  ALTER TABLE "sources" ADD COLUMN "pre_version" varchar;
  ALTER TABLE "sources" ADD COLUMN "pre_url" varchar;
  ALTER TABLE "sources" ADD COLUMN "pre_date" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sources" DROP COLUMN "stable_version";
  ALTER TABLE "sources" DROP COLUMN "stable_url";
  ALTER TABLE "sources" DROP COLUMN "stable_date";
  ALTER TABLE "sources" DROP COLUMN "pre_version";
  ALTER TABLE "sources" DROP COLUMN "pre_url";
  ALTER TABLE "sources" DROP COLUMN "pre_date";`)
}
