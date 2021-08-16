import chalk from 'chalk';
import postgres from 'postgres';
import config from './config';
import { setDelay, findGoldfishEvent } from './scrapeGoldfish';

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

export const updateDatabase = async (players, event, page, obj) => {
  const { i, progress, dbQueue, queueLength } = obj;
  const goldfishData = await findGoldfishEvent(
    page,
    event.format, event.type, event.uid,
    i + 1, progress,
    dbQueue.length, queueLength,
  );
  const uri = `${event.format}-${event.type}-${event.date.replaceAll('/','-')}`;
  let [events] = await sql`SELECT * FROM events WHERE uid = ${event.uid}`;
  let [results] = await sql`SELECT * FROM results WHERE event = ${event.uid}`;

  let archetypes = await sql`SELECT archetype FROM results WHERE event = ${event.uid}`;
  archetypes = archetypes.filter(value => Object.keys(value).length !== 0);
  if (process.argv.includes('--force')) archetypes = [];
  if (events && results && archetypes?.length) {
    console.info(chalk.yellowBright(`Event already exists: ${uri}`));
  } else {
    // Delete old entries
    await sql`DELETE FROM events WHERE uid = ${event.uid}`;
    await sql`DELETE FROM results WHERE event = ${event.uid}`;

    // Create new entries
    await sql`INSERT INTO events ${sql(event)}`;
    await Promise.all(
      players.map(player => {
        const goldfishArchetype = !goldfishData ? {} : goldfishData.find(obj => obj.player === player.username);
        if (goldfishArchetype?.player !== player.username) player.archetype = {};
        else {
          player.archetype = {
            mtggoldfish: {
              uid: goldfishArchetype.archetype_uid,
              displayName: goldfishArchetype.displayName,
              alias: goldfishArchetype.alias,
              deck_uid: goldfishArchetype.deck_uid,
            },
          };
        }
        sql.unsafe(
          `INSERT INTO results (${Object.keys(player)}) VALUES (${Object.keys(player).map((_, i) => `$${i + 1}`)})`,
          Object.values(player).map(v => typeof v === 'string' ? v : JSON.stringify(v))
        );
      })
    );
    console.info(chalk.greenBright(`Event created: ${uri}`));
    await setDelay(1000);
  }
}