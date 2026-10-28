import * as migration_20261027_185617_initial from './20261027_185617_initial';
import * as migration_20261027_204836_news_jobs from './20261027_204836_news_jobs';
import * as migration_20261027_214513_builds_author_name from './20261027_214513_builds_author_name';
import * as migration_20261027_221955_deals_radar from './20261027_221955_deals_radar';
import * as migration_20261027_222744_newsletter from './20261027_222744_newsletter';
import * as migration_20261028_091014_news_keywords_deal_discount from './20261028_091014_news_keywords_deal_discount';
import * as migration_20261028_132121_browser_sources_permissions from './20261028_132121_browser_sources_permissions';
import * as migration_20261028_140242_eu_marketplaces from './20261028_140242_eu_marketplaces';

export const migrations = [
  {
    up: migration_20261027_185617_initial.up,
    down: migration_20261027_185617_initial.down,
    name: '20261027_185617_initial',
  },
  {
    up: migration_20261027_204836_news_jobs.up,
    down: migration_20261027_204836_news_jobs.down,
    name: '20261027_204836_news_jobs',
  },
  {
    up: migration_20261027_214513_builds_author_name.up,
    down: migration_20261027_214513_builds_author_name.down,
    name: '20261027_214513_builds_author_name',
  },
  {
    up: migration_20261027_221955_deals_radar.up,
    down: migration_20261027_221955_deals_radar.down,
    name: '20261027_221955_deals_radar',
  },
  {
    up: migration_20261027_222744_newsletter.up,
    down: migration_20261027_222744_newsletter.down,
    name: '20261027_222744_newsletter',
  },
  {
    up: migration_20261028_091014_news_keywords_deal_discount.up,
    down: migration_20261028_091014_news_keywords_deal_discount.down,
    name: '20261028_091014_news_keywords_deal_discount',
  },
  {
    up: migration_20261028_132121_browser_sources_permissions.up,
    down: migration_20261028_132121_browser_sources_permissions.down,
    name: '20261028_132121_browser_sources_permissions',
  },
  {
    up: migration_20261028_140242_eu_marketplaces.up,
    down: migration_20261028_140242_eu_marketplaces.down,
    name: '20261028_140242_eu_marketplaces'
  },
];
