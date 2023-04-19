import sql from './database.js';

import usePuppeteerStealth from './puppeteer.js';

import { getCatalog } from './catalog.js';
import scrapeEvent from './mtgo.js';
import scrapeGoldfish from './mtggoldfish.js';


const is_cron = process.argv[2] === 'cron';
const is_forced = process.argv.includes('--force');


/**
 * Create date range
 */
function getDates(startDate, endDate = new Date(), offset=0) {
  const day = 24 * 60 * 60 * 1000; // 1 day in milliseconds
  const dates = !startDate
    ? [new Date(new Date().valueOf() - offset)]
    : Array.from(
      { length: ((new Date(endDate) - new Date(startDate)) / day) + 1 },
      (_, i) => new Date(new Date(startDate).valueOf() + day * i - offset)
    );
  return [...new Set(dates.map(d => d.toISOString().replace(/T.*/,'')))];
};


export const scrape = async () => {
  // Clear console
  process.stdout.write('\x1Bc');
  console.log('Scraping WotC Events...');

  // Setup puppeteer
  const { browser, page } = await usePuppeteerStealth();

  // Create date range from CLI args
  let args = process.argv.slice(2);
  if (is_cron) args = args.splice(indexOf('cron') - 2, 1);
  if (is_forced) args.splice(args.indexOf('--force') - 2, 1);
  const dates = getDates(...args);

  // Create a blacklist of pre-existing events in date range
  const catalog = await getCatalog(dates);
  const blacklist = (await sql.unsafe(`
    SELECT uid FROM events
    WHERE uid IN (${catalog.map(({ eventID }) => eventID)})
    ORDER BY date::DATE DESC, uid DESC;
  `))?.map(({ uid }) => uid);

  // Scrape WotC events by URI
  const uris = catalog
    .filter(({ eventID }) => !blacklist.includes(eventID))
  for (let i = 0; i < uris.length; i++) {
    // Clear console
    process.stdout.write('\x1Bc');
    console.log(`(${i+1}/${uris.length}) Scraping ${uris[i].uri}...`);

    // Check if event somehow already exists.
    const e = await sql`SELECT * FROM events WHERE uid = ${uris[i].eventID}`;
    const r = await sql`SELECT * FROM results WHERE event = ${uris[i].eventID}`;
    if (e.count && r.count) {
      console.error(`Event id ${uris[i].eventID} already exists.`);
      process.exit(0);
    }

    // Scrape MTGGoldfish for archetype labels
    const goldfishData = await scrapeGoldfish(page, uris[i]);
    // Scrape event from MTGO website
    const { players, ...event } = await scrapeEvent(page, uris[i]);

    if (goldfishData) uris[i]['has-goldfishData'] = true;
    if (players.length) uris[i]['has-playerData'] = true;
    if (!goldfishData || !players.length) {
      console.log('Skipping...');
      continue;
    };

    // Update database with event data
    await sql`INSERT INTO events ${sql(event)}`;
    for (let i = 0; i < players.length; i++) {
      players[i].archetype['mtggoldfish'] = (goldfishData?.[players[i].username] ?? {});
      const cols = Object.keys(players[i]); const vals = Object.values(players[i]);
      await sql.unsafe(
       `INSERT INTO results (${cols}) VALUES (${cols.map((_, i) => `$${i+1}`)})`,
       vals.map(v => typeof v === 'string' ? v : JSON.stringify(v))
      );
    };
  };

  let table = {}; let missing = {};
  dates.reverse().forEach(_date => {
    const _uris = uris.filter(({ date }) => date === _date);
    const row = {
      'prev': blacklist
        ?.filter(_uid => catalog
          .filter(({ date }) => date === _date)
          .map(({ eventID }) => eventID)
          .includes(_uid)
        )?.length,
      'new': _uris
        .filter(obj => obj?.['has-goldfishData'] && obj?.['has-playerData'])
        .length,
      'missing-goldfish': _uris
        .filter(obj => !obj?.['has-goldfishData'])
        .length,
      'missing-players': _uris
        .filter(obj => !obj?.['has-playerData'])
        .length,
    };
    if (row['missing-goldfish'] || row['missing-players']) {
      missing[_date] = row;
    } else if (row['prev'] || row['new']) {
      table[_date] = row;
    };
  });

  // Clear console
  process.stdout.write('\x1Bc');
  if (Object.keys(table).length) {
    console.log('Normal entries:');
    console.table(table);
  }
  if (Object.keys(missing).length) {
    console.log('Missing entries:');
    console.table(missing);
  }

  // Cleanup puppeteer
  await page.close();
  await browser.close();
}