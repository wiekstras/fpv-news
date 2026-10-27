import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_news_items_tags" AS ENUM('firmware', 'new-gear', 'video', 'tutorial', 'regulation', 'review', 'community');
  CREATE TYPE "public"."enum_sources_default_tags" AS ENUM('firmware', 'new-gear', 'video', 'tutorial', 'regulation', 'review', 'community');
  CREATE TYPE "public"."enum_sources_type" AS ENUM('rss', 'youtube', 'github', 'blog');
  CREATE TYPE "public"."enum_builds_tags" AS ENUM('freestyle', 'cinewhoop', 'long-range', 'racing', 'tiny-whoop', 'analog', 'digital', 'budget');
  CREATE TYPE "public"."enum_builds_status" AS ENUM('draft', 'pending', 'published');
  CREATE TYPE "public"."enum_builds_difficulty" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum_builds_frame_size" AS ENUM('whoop', '2"', '2.5"', '3"', '3.5"', '4"', '5"', '6"', '7"', '8"+');
  CREATE TYPE "public"."enum_parts_category" AS ENUM('frame', 'motors', 'esc', 'flight-controller', 'stack', 'vtx', 'camera', 'receiver', 'antenna', 'props', 'battery', 'goggles', 'radio', 'other');
  CREATE TYPE "public"."enum_subscribers_status" AS ENUM('pending', 'confirmed', 'unsubscribed');
  CREATE TYPE "public"."enum_digests_items_kind" AS ENUM('news', 'build');
  CREATE TYPE "public"."enum_digests_status" AS ENUM('draft', 'sending', 'sent');
  CREATE TYPE "public"."enum_email_events_type" AS ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained');
  CREATE TYPE "public"."enum_saved_searches_countries" AS ENUM('NL', 'BE', 'DE', 'AT', 'FR', 'IT', 'ES', 'PT', 'PL', 'CZ', 'DK', 'SE', 'IE', 'GB');
  CREATE TYPE "public"."enum_saved_searches_sources" AS ENUM('ebay', 'marktplaats', 'kleinanzeigen', 'subito', 'wallapop', 'milanuncios', 'leboncoin', 'vinted');
  CREATE TYPE "public"."enum_listings_source" AS ENUM('ebay', 'marktplaats', 'kleinanzeigen', 'subito', 'wallapop', 'milanuncios', 'leboncoin', 'vinted');
  CREATE TYPE "public"."enum_listings_state" AS ENUM('new', 'interesting', 'ignored');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'contributor');
  CREATE TYPE "public"."enum_settings_digest_day" AS ENUM('0', '1', '2', '3', '4', '5', '6');
  CREATE TABLE "news_items_tags" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_news_items_tags",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "news_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"source_id" integer NOT NULL,
  	"url" varchar NOT NULL,
  	"canonical_url" varchar NOT NULL,
  	"normalized_title" varchar,
  	"published_at" timestamp(3) with time zone NOT NULL,
  	"summary" varchar,
  	"thumbnail_url" varchar,
  	"hidden" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sources_default_tags" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_sources_default_tags",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"type" "enum_sources_type" DEFAULT 'rss' NOT NULL,
  	"url" varchar NOT NULL,
  	"site_url" varchar,
  	"active" boolean DEFAULT true,
  	"last_fetched_at" timestamp(3) with time zone,
  	"last_error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "builds_tags" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_builds_tags",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "builds_parts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"part_id" integer,
  	"free_text" varchar,
  	"quantity" numeric DEFAULT 1,
  	"note" varchar
  );
  
  CREATE TABLE "builds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"status" "enum_builds_status" DEFAULT 'draft' NOT NULL,
  	"moderation_note" varchar,
  	"author_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"excerpt" varchar,
  	"difficulty" "enum_builds_difficulty" NOT NULL,
  	"frame_size" "enum_builds_frame_size" NOT NULL,
  	"content" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "builds_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"uploaded_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar
  );
  
  CREATE TABLE "parts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"brand" varchar,
  	"category" "enum_parts_category" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "retailers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"url" varchar,
  	"country" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "affiliate_links" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"part_id" integer NOT NULL,
  	"retailer_id" integer NOT NULL,
  	"url" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subscribers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"status" "enum_subscribers_status" DEFAULT 'pending' NOT NULL,
  	"token" varchar NOT NULL,
  	"consent_at" timestamp(3) with time zone NOT NULL,
  	"consent_text" varchar NOT NULL,
  	"confirmed_at" timestamp(3) with time zone,
  	"unsubscribed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "digests_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_digests_items_kind" DEFAULT 'news' NOT NULL,
  	"news_item_id" integer,
  	"build_id" integer,
  	"blurb" varchar
  );
  
  CREATE TABLE "digests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subject" varchar NOT NULL,
  	"week_of" timestamp(3) with time zone NOT NULL,
  	"status" "enum_digests_status" DEFAULT 'draft' NOT NULL,
  	"intro" varchar,
  	"featured_build_id" integer,
  	"stats_sent_at" timestamp(3) with time zone,
  	"stats_recipients" numeric DEFAULT 0,
  	"stats_opened" numeric DEFAULT 0,
  	"stats_clicked" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "email_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"digest_id" integer NOT NULL,
  	"subscriber_id" integer,
  	"type" "enum_email_events_type" NOT NULL,
  	"url" varchar,
  	"resend_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "saved_searches_countries" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_saved_searches_countries",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "saved_searches_sources" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_saved_searches_sources",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "saved_searches" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"keywords" varchar NOT NULL,
  	"min_price" numeric,
  	"max_price" numeric,
  	"alert_below" numeric,
  	"active" boolean DEFAULT true,
  	"last_run_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "listings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"source" "enum_listings_source" NOT NULL,
  	"external_id" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"price" numeric,
  	"currency" varchar DEFAULT 'EUR',
  	"price_eur" numeric,
  	"location" varchar,
  	"country" varchar,
  	"url" varchar NOT NULL,
  	"image" varchar,
  	"posted_at" timestamp(3) with time zone,
  	"first_seen_at" timestamp(3) with time zone NOT NULL,
  	"saved_search_id" integer,
  	"state" "enum_listings_state" DEFAULT 'new' NOT NULL,
  	"alerted_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'contributor' NOT NULL,
  	"last_deals_visit_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"news_items_id" integer,
  	"sources_id" integer,
  	"builds_id" integer,
  	"media_id" integer,
  	"parts_id" integer,
  	"retailers_id" integer,
  	"affiliate_links_id" integer,
  	"subscribers_id" integer,
  	"digests_id" integer,
  	"email_events_id" integer,
  	"saved_searches_id" integer,
  	"listings_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_name" varchar DEFAULT 'FPV News' NOT NULL,
  	"tagline" varchar DEFAULT 'FPV news, community builds and a weekly digest.',
  	"admin_email" varchar,
  	"claude_summaries" boolean DEFAULT false,
  	"digest_day" "enum_settings_digest_day" DEFAULT '5' NOT NULL,
  	"digest_time" varchar DEFAULT '09:00' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "news_items_tags" ADD CONSTRAINT "news_items_tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_items" ADD CONSTRAINT "news_items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sources_default_tags" ADD CONSTRAINT "sources_default_tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "builds_tags" ADD CONSTRAINT "builds_tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."builds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "builds_parts" ADD CONSTRAINT "builds_parts_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "builds_parts" ADD CONSTRAINT "builds_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."builds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "builds" ADD CONSTRAINT "builds_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "builds_rels" ADD CONSTRAINT "builds_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."builds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "builds_rels" ADD CONSTRAINT "builds_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "digests_items" ADD CONSTRAINT "digests_items_news_item_id_news_items_id_fk" FOREIGN KEY ("news_item_id") REFERENCES "public"."news_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "digests_items" ADD CONSTRAINT "digests_items_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "digests_items" ADD CONSTRAINT "digests_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."digests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "digests" ADD CONSTRAINT "digests_featured_build_id_builds_id_fk" FOREIGN KEY ("featured_build_id") REFERENCES "public"."builds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "email_events" ADD CONSTRAINT "email_events_digest_id_digests_id_fk" FOREIGN KEY ("digest_id") REFERENCES "public"."digests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "email_events" ADD CONSTRAINT "email_events_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "saved_searches_countries" ADD CONSTRAINT "saved_searches_countries_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "saved_searches_sources" ADD CONSTRAINT "saved_searches_sources_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "listings" ADD CONSTRAINT "listings_saved_search_id_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_items_fk" FOREIGN KEY ("news_items_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_builds_fk" FOREIGN KEY ("builds_id") REFERENCES "public"."builds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parts_fk" FOREIGN KEY ("parts_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_retailers_fk" FOREIGN KEY ("retailers_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_affiliate_links_fk" FOREIGN KEY ("affiliate_links_id") REFERENCES "public"."affiliate_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscribers_fk" FOREIGN KEY ("subscribers_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_digests_fk" FOREIGN KEY ("digests_id") REFERENCES "public"."digests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_events_fk" FOREIGN KEY ("email_events_id") REFERENCES "public"."email_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_saved_searches_fk" FOREIGN KEY ("saved_searches_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_listings_fk" FOREIGN KEY ("listings_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "news_items_tags_order_idx" ON "news_items_tags" USING btree ("order");
  CREATE INDEX "news_items_tags_parent_idx" ON "news_items_tags" USING btree ("parent_id");
  CREATE UNIQUE INDEX "news_items_slug_idx" ON "news_items" USING btree ("slug");
  CREATE INDEX "news_items_source_idx" ON "news_items" USING btree ("source_id");
  CREATE UNIQUE INDEX "news_items_canonical_url_idx" ON "news_items" USING btree ("canonical_url");
  CREATE INDEX "news_items_normalized_title_idx" ON "news_items" USING btree ("normalized_title");
  CREATE INDEX "news_items_published_at_idx" ON "news_items" USING btree ("published_at");
  CREATE INDEX "news_items_updated_at_idx" ON "news_items" USING btree ("updated_at");
  CREATE INDEX "news_items_created_at_idx" ON "news_items" USING btree ("created_at");
  CREATE INDEX "sources_default_tags_order_idx" ON "sources_default_tags" USING btree ("order");
  CREATE INDEX "sources_default_tags_parent_idx" ON "sources_default_tags" USING btree ("parent_id");
  CREATE UNIQUE INDEX "sources_slug_idx" ON "sources" USING btree ("slug");
  CREATE INDEX "sources_updated_at_idx" ON "sources" USING btree ("updated_at");
  CREATE INDEX "sources_created_at_idx" ON "sources" USING btree ("created_at");
  CREATE INDEX "builds_tags_order_idx" ON "builds_tags" USING btree ("order");
  CREATE INDEX "builds_tags_parent_idx" ON "builds_tags" USING btree ("parent_id");
  CREATE INDEX "builds_parts_order_idx" ON "builds_parts" USING btree ("_order");
  CREATE INDEX "builds_parts_parent_id_idx" ON "builds_parts" USING btree ("_parent_id");
  CREATE INDEX "builds_parts_part_idx" ON "builds_parts" USING btree ("part_id");
  CREATE UNIQUE INDEX "builds_slug_idx" ON "builds" USING btree ("slug");
  CREATE INDEX "builds_status_idx" ON "builds" USING btree ("status");
  CREATE INDEX "builds_author_idx" ON "builds" USING btree ("author_id");
  CREATE INDEX "builds_published_at_idx" ON "builds" USING btree ("published_at");
  CREATE INDEX "builds_updated_at_idx" ON "builds" USING btree ("updated_at");
  CREATE INDEX "builds_created_at_idx" ON "builds" USING btree ("created_at");
  CREATE INDEX "builds_rels_order_idx" ON "builds_rels" USING btree ("order");
  CREATE INDEX "builds_rels_parent_idx" ON "builds_rels" USING btree ("parent_id");
  CREATE INDEX "builds_rels_path_idx" ON "builds_rels" USING btree ("path");
  CREATE INDEX "builds_rels_media_id_idx" ON "builds_rels" USING btree ("media_id");
  CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "parts_updated_at_idx" ON "parts" USING btree ("updated_at");
  CREATE INDEX "parts_created_at_idx" ON "parts" USING btree ("created_at");
  CREATE INDEX "retailers_updated_at_idx" ON "retailers" USING btree ("updated_at");
  CREATE INDEX "retailers_created_at_idx" ON "retailers" USING btree ("created_at");
  CREATE INDEX "affiliate_links_part_idx" ON "affiliate_links" USING btree ("part_id");
  CREATE INDEX "affiliate_links_retailer_idx" ON "affiliate_links" USING btree ("retailer_id");
  CREATE INDEX "affiliate_links_updated_at_idx" ON "affiliate_links" USING btree ("updated_at");
  CREATE INDEX "affiliate_links_created_at_idx" ON "affiliate_links" USING btree ("created_at");
  CREATE UNIQUE INDEX "subscribers_email_idx" ON "subscribers" USING btree ("email");
  CREATE INDEX "subscribers_status_idx" ON "subscribers" USING btree ("status");
  CREATE UNIQUE INDEX "subscribers_token_idx" ON "subscribers" USING btree ("token");
  CREATE INDEX "subscribers_updated_at_idx" ON "subscribers" USING btree ("updated_at");
  CREATE INDEX "subscribers_created_at_idx" ON "subscribers" USING btree ("created_at");
  CREATE INDEX "digests_items_order_idx" ON "digests_items" USING btree ("_order");
  CREATE INDEX "digests_items_parent_id_idx" ON "digests_items" USING btree ("_parent_id");
  CREATE INDEX "digests_items_news_item_idx" ON "digests_items" USING btree ("news_item_id");
  CREATE INDEX "digests_items_build_idx" ON "digests_items" USING btree ("build_id");
  CREATE INDEX "digests_featured_build_idx" ON "digests" USING btree ("featured_build_id");
  CREATE INDEX "digests_updated_at_idx" ON "digests" USING btree ("updated_at");
  CREATE INDEX "digests_created_at_idx" ON "digests" USING btree ("created_at");
  CREATE INDEX "email_events_digest_idx" ON "email_events" USING btree ("digest_id");
  CREATE INDEX "email_events_subscriber_idx" ON "email_events" USING btree ("subscriber_id");
  CREATE INDEX "email_events_resend_id_idx" ON "email_events" USING btree ("resend_id");
  CREATE INDEX "email_events_updated_at_idx" ON "email_events" USING btree ("updated_at");
  CREATE INDEX "email_events_created_at_idx" ON "email_events" USING btree ("created_at");
  CREATE INDEX "saved_searches_countries_order_idx" ON "saved_searches_countries" USING btree ("order");
  CREATE INDEX "saved_searches_countries_parent_idx" ON "saved_searches_countries" USING btree ("parent_id");
  CREATE INDEX "saved_searches_sources_order_idx" ON "saved_searches_sources" USING btree ("order");
  CREATE INDEX "saved_searches_sources_parent_idx" ON "saved_searches_sources" USING btree ("parent_id");
  CREATE INDEX "saved_searches_updated_at_idx" ON "saved_searches" USING btree ("updated_at");
  CREATE INDEX "saved_searches_created_at_idx" ON "saved_searches" USING btree ("created_at");
  CREATE INDEX "listings_source_idx" ON "listings" USING btree ("source");
  CREATE INDEX "listings_price_eur_idx" ON "listings" USING btree ("price_eur");
  CREATE INDEX "listings_country_idx" ON "listings" USING btree ("country");
  CREATE INDEX "listings_first_seen_at_idx" ON "listings" USING btree ("first_seen_at");
  CREATE INDEX "listings_saved_search_idx" ON "listings" USING btree ("saved_search_id");
  CREATE INDEX "listings_state_idx" ON "listings" USING btree ("state");
  CREATE INDEX "listings_updated_at_idx" ON "listings" USING btree ("updated_at");
  CREATE INDEX "listings_created_at_idx" ON "listings" USING btree ("created_at");
  CREATE UNIQUE INDEX "source_externalId_idx" ON "listings" USING btree ("source","external_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_news_items_id_idx" ON "payload_locked_documents_rels" USING btree ("news_items_id");
  CREATE INDEX "payload_locked_documents_rels_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("sources_id");
  CREATE INDEX "payload_locked_documents_rels_builds_id_idx" ON "payload_locked_documents_rels" USING btree ("builds_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_parts_id_idx" ON "payload_locked_documents_rels" USING btree ("parts_id");
  CREATE INDEX "payload_locked_documents_rels_retailers_id_idx" ON "payload_locked_documents_rels" USING btree ("retailers_id");
  CREATE INDEX "payload_locked_documents_rels_affiliate_links_id_idx" ON "payload_locked_documents_rels" USING btree ("affiliate_links_id");
  CREATE INDEX "payload_locked_documents_rels_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("subscribers_id");
  CREATE INDEX "payload_locked_documents_rels_digests_id_idx" ON "payload_locked_documents_rels" USING btree ("digests_id");
  CREATE INDEX "payload_locked_documents_rels_email_events_id_idx" ON "payload_locked_documents_rels" USING btree ("email_events_id");
  CREATE INDEX "payload_locked_documents_rels_saved_searches_id_idx" ON "payload_locked_documents_rels" USING btree ("saved_searches_id");
  CREATE INDEX "payload_locked_documents_rels_listings_id_idx" ON "payload_locked_documents_rels" USING btree ("listings_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "news_items_tags" CASCADE;
  DROP TABLE "news_items" CASCADE;
  DROP TABLE "sources_default_tags" CASCADE;
  DROP TABLE "sources" CASCADE;
  DROP TABLE "builds_tags" CASCADE;
  DROP TABLE "builds_parts" CASCADE;
  DROP TABLE "builds" CASCADE;
  DROP TABLE "builds_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "parts" CASCADE;
  DROP TABLE "retailers" CASCADE;
  DROP TABLE "affiliate_links" CASCADE;
  DROP TABLE "subscribers" CASCADE;
  DROP TABLE "digests_items" CASCADE;
  DROP TABLE "digests" CASCADE;
  DROP TABLE "email_events" CASCADE;
  DROP TABLE "saved_searches_countries" CASCADE;
  DROP TABLE "saved_searches_sources" CASCADE;
  DROP TABLE "saved_searches" CASCADE;
  DROP TABLE "listings" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "settings" CASCADE;
  DROP TYPE "public"."enum_news_items_tags";
  DROP TYPE "public"."enum_sources_default_tags";
  DROP TYPE "public"."enum_sources_type";
  DROP TYPE "public"."enum_builds_tags";
  DROP TYPE "public"."enum_builds_status";
  DROP TYPE "public"."enum_builds_difficulty";
  DROP TYPE "public"."enum_builds_frame_size";
  DROP TYPE "public"."enum_parts_category";
  DROP TYPE "public"."enum_subscribers_status";
  DROP TYPE "public"."enum_digests_items_kind";
  DROP TYPE "public"."enum_digests_status";
  DROP TYPE "public"."enum_email_events_type";
  DROP TYPE "public"."enum_saved_searches_countries";
  DROP TYPE "public"."enum_saved_searches_sources";
  DROP TYPE "public"."enum_listings_source";
  DROP TYPE "public"."enum_listings_state";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_settings_digest_day";`)
}
