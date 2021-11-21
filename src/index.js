import fetch from 'node-fetch';
import { formatCardsCollection } from './cards/cards-collection.js';
const _run = async () => {
  let data = await formatCardsCollection();
}

_run();

// import chalk from 'chalk';
// import { CronJob } from 'cron';
// import usePuppeteerStealth from './puppeteer'
// import scrapeEvent from './scrapeEvent';
// import { sql, updateDatabase } from './database';

// const EVENT_FORMATS = [
//   'standard',
//   'pioneer',
//   'modern',
//   'legacy',
//   'vintage',
//   'pauper'
// ];
// const EVENT_TYPES = [
//   'mocs',
//   'preliminary',
//   'challenge',
//   'champs',
//   'premier',
//   'super-qualifier',
//   'players-tour-qualifier',
//   'showcase-challenge',
// ];

// // Create date range
// const day = 1000 * 60 * 60 * 24;
// const offset = day / 4;
// const getDates = (startDate, endDate = new Date()) => {
//   if (!startDate) return [new Date(new Date().valueOf() - offset)];

//   const duration = new Date(endDate) - new Date(startDate);
//   const steps = duration / day;

//   return Array.from(
//     { length: steps + 1 },
//     (_, i) => new Date(new Date(startDate).valueOf() + day * i - offset)
//   );
// };

// const runCron = process.argv[2] === 'cron';

// const run = async () => {
//   try {
//     // Clear console
//     process.stdout.write('\x1Bc');
//     console.log('Scraping WotC Events...');
//     // Create date range and daily event queue
//     let args = process.argv.slice(2);
//     if (process.argv[2] === 'cron') args = args.splice(indexOf('cron') - 2, 1);
//     if (process.argv.includes('--force')) args.splice(args.indexOf('--force') - 2, 1);
//     const dates = getDates(...args);
//     const queue = EVENT_FORMATS.map(format =>
//       EVENT_TYPES.map(type => ({ format, type }))
//     ).flat();

//     const startTime = Date.now();

//     // Scrape WotC events in parallel
//     let dbQueue = [];
//     let queueLength = 0;
//     let _queueLength = 0;
//     let goldfishQueue = [];
//     await Promise.all(
//       queue.map(async ({ format, type }) => {
//         // Fetch dates synchronously to avoid timeout
//         for (let i = 0; i < dates.length; i++) {
//           // Scrape by URI
//           const date = dates[i].toISOString().substring(0, 10);
//           const uri = `${format}-${type}-${date}`;

//           const [_events] = await sql`SELECT * FROM events WHERE uri = ${uri}`;
//           if (_events && !process.argv.includes('--force')) {
//             let [results] = await sql`SELECT * FROM results WHERE event = ${_events.uid}`;
//             let archetypes = await sql`SELECT archetype FROM results WHERE event = ${_events.uid}`;
//             archetypes = archetypes.filter(value => Object.keys(value).length !== 0);
//             if (process.argv.includes('--force')) archetypes = [];
//             if (results && archetypes?.length) continue;
//           }

//           const data = await scrapeEvent(uri);
//           _queueLength += 1;

//           const elapsedTime = (Date.now() - startTime) / 1000;
//           const _queueRate = elapsedTime / _queueLength;
//           const _progress = `${((_queueLength / (queue.length * dates.length))*100).toFixed(2)}%`;

//           // Get time in nearest days, hours, minutes and seconds
//           let totalSeconds = ((queue.length * dates.length) - _queueLength) * _queueRate;
//           let days = Math.floor(totalSeconds / 86400).toFixed(0);
//           let hours = Math.floor(totalSeconds / 3600).toFixed(0);
//             totalSeconds %= 3600;
//           let minutes = Math.floor(totalSeconds / 60).toFixed(0);
//           let seconds = (totalSeconds % 60).toFixed(0);
//           // Create array of these values to later filter out null values
//           let formattedArray = totalSeconds.toFixed(0) == 0 ? ['', '', '', '0 seconds'] : [
//             days > 0 ? `${ days } ${ (days == 1 ? 'day' : 'days') }` : ``,
//             hours > 0 ? `${ hours } ${ (hours == 1 ? 'hour' : 'hours') }` : ``,
//             minutes > 0 ? `${ minutes } ${ (minutes == 1 ? 'minute' : 'minutes') }` : ``,
//             seconds > 0 ? `${ seconds } ${ (seconds == 1 ? 'second' : 'seconds') }` : ``,
//           ];
//           const timeRemaining = formattedArray
//             .filter(Boolean)
//             .join(', ')
//             // Replace last comma with ' and' for fluency
//             .replace(/, ([^,]*)$/, ' and $1');

//           if (data) {
//             let [events] = await sql`SELECT * FROM events WHERE uid = ${data.uid}`;
//             let [results] = await sql`SELECT * FROM results WHERE event = ${data.uid}`;

//             let archetypes = await sql`SELECT archetype FROM results WHERE event = ${data.uid}`;
//             archetypes = archetypes.filter(value => Object.keys(value).length !== 0);
//             if (process.argv.includes('--force')) archetypes = [];

//             process.stdout.write('\x1Bc');
//             console.log('Scraping WotC Events...');
//             console.log(`${chalk.yellow(`Progress: ${_queueLength}/${(queue.length * dates.length)}`)} (${_progress} complete).`);
//             console.log(`${timeRemaining} remaining.\n`);

//             if (events && results && archetypes?.length) {
//               console.info(chalk.yellowBright(`Event skipped: ${uri}`));
//             }
//             else {
//               let { players, ...event } = data;
//               dbQueue.push({ players, event });
//               queueLength += players.length;
//               goldfishQueue.push({ format: event.format, type: event.type, uid: event.uid });
//               console.info(chalk.blueBright(`Added to queue: ${uri}`));
//             }
//           }
//         }
//       })
//     );

//     // Clear console
//     process.stdout.write('\x1Bc');
//     console.log('Scraping MTGGoldfish Events...');
//     // Setup Puppeteer
//     const { browser, page } = await usePuppeteerStealth();
//     // Update database entries syncronously
//     let progress = 0;
//     for (let i = 0; i < dbQueue?.length; i++) {
//       const { players, event } = dbQueue[i];
//       try {
//         await updateDatabase(players, event, page,
//           { i, progress, dbQueue, queueLength },
//         );
//       } catch (error) {
//         const uri = `${event.format}-${event.type}-${event.date.replaceAll('/','-')}`
//         console.log(`Error: ${uri} (${i + 1}/${dbQueue.length})`);
//         console.error(chalk.red(error.stack));
//         process.exit(1);
//       }
//       progress += players.length + 1;
//     }

//     // Cleanup
//     await page.close();
//     await browser.close();
//     process.exit(0);
//   } catch (error) {
//     console.error(chalk.red(error.stack));
//     process.exit(1);
//   }
// };

// if (runCron) {
//   // Fetch as WotC posts events
//   const job = new CronJob('* */30 10-15 * * *', run, null, null, 'America/Chicago');
//   job.start();
// } else {
//   run();
// }