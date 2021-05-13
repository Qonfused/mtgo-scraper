import postgres from 'postgres';
import config from './config';

/**
 * Queries database, accepts a template string or JSON to format.
 *
 * @example sql`SELECT * FROM users`
 * @example sql`INSERT INTO users ${sql(user)}`
 */
export const sql = postgres(config.connectionString);
