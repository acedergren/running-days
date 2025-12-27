/**
 * Database Plugin
 * Provides database connection to all routes
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createDatabase, type Database } from '@running-days/database';
import type { Config } from '../config.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

interface DatabasePluginOptions {
  config: Config;
}

const databasePluginImpl: FastifyPluginAsync<DatabasePluginOptions> = async (fastify, options) => {
  const { config } = options;

  fastify.log.info(`Connecting to database at ${config.databasePath}`);

  const db = createDatabase({
    type: 'sqlite',
    path: config.databasePath
  });

  fastify.decorate('db', db);

  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing database connection');
    // SQLite via better-sqlite3 doesn't need explicit close
  });
};

export const databasePlugin = fp(databasePluginImpl, {
  name: 'database',
  fastify: '5.x'
});
