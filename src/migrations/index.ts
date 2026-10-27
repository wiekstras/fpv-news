import * as migration_20261027_185617_initial from './20261027_185617_initial';
import * as migration_20261027_204836_news_jobs from './20261027_204836_news_jobs';
import * as migration_20261027_214513_builds_author_name from './20261027_214513_builds_author_name';
import * as migration_20261027_221955_deals_radar from './20261027_221955_deals_radar';

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
    name: '20261027_221955_deals_radar'
  },
];
