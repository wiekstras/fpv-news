import * as migration_20261027_185617_initial from './20261027_185617_initial';
import * as migration_20261027_204836_news_jobs from './20261027_204836_news_jobs';

export const migrations = [
  {
    up: migration_20261027_185617_initial.up,
    down: migration_20261027_185617_initial.down,
    name: '20261027_185617_initial',
  },
  {
    up: migration_20261027_204836_news_jobs.up,
    down: migration_20261027_204836_news_jobs.down,
    name: '20261027_204836_news_jobs'
  },
];
