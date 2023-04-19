// import chalk from 'chalk';
import postgres from 'postgres';

import config from './config.js';


/**
 * Queries database, accepts a template string or JSON to format.
 *
 * @example sql`SELECT * FROM users`
 * @example sql`INSERT INTO users ${sql(user)}`
 */
export const sql = postgres(config.connectionString, {
  max: 1,
  no_prepare: true,
  idle_timeout: 3,
});

export default sql;

// export async function add_event(event, players) {
//   await sql`INSERT INTO events ${sql(event)}`;
//   for (let i = 0; i < players.length; i++) {
//     const cols = Object.keys(players[i]);
//     const vals = Object.values(players[i]);
//     sql.unsafe(
//       `INSERT INTO results (${cols}) VALUES (${cols.map((_, i) => `$${i+1}`)})`,
//       vals.map(v => typeof v === 'string' ? v : JSON.stringify(v))
//     );
//   };
// }

// export async function verify_event(uid) {
//   let [events] = await sql`SELECT * FROM events WHERE uid = ${uid}`;
//   let [results] = await sql`SELECT * FROM results WHERE event = ${uid}`;
//   if (events && results) {
//     let [archetypes] = await sql`SELECT * FROM results WHERE event = ${uid} and archetype::text = '{}'::text;`
//     if (!archetypes) {
//       console.info(chalk.yellowBright(`Event missing archetypes: ${uri}`));
//     } else {
//       console.info(chalk.yellowBright(`Event already exists: ${uri}`));
//     }
//   } else {
//     console.info(chalk.yellowBright(`Event does not exist: ${uri}`));
//   }
// }

// export async function delete_event(uid) {
//   await sql`DELETE FROM events WHERE uid = ${uid}`;
//   await sql`DELETE FROM results WHERE event = ${uid}`;
// }