import { CronJob } from 'cron';
import { scrapeCatalog } from './scraper/mtgo.js';
import { scrape } from './scraper/index.js';

process.removeAllListeners('warning')
scrape();

// if (process.argv.includes('--watch')) {
//   async function watch() {
//     for (let i = 0; i < 1;) {
//       // Run every 30 minutes
//       if (
//         ((new Date().getMinutes() % 30) === 0)
//         // Run between 10 AM and 3 PM
//         && new Date().getHours() >= 10
//         && new Date().getHours() < 16
//       ) {
//         await run();
//       }

//       const delay =
//         ((new Date().getMinutes() >= 30
//           ? Math.abs(new Date().getMinutes() - 60)
//           : Math.abs(new Date().getMinutes() - 30)
//         ) * 60 * 10**3)
//         - (new Date().getSeconds() * 10**3)
//         - (new Date().getMilliseconds());

//       const next_run =
//       (new Date().getHours() >= 10
//       && new Date().getHours() < 16)
//         ? new Date(new Date().getTime() + delay)
//         : Date.parse(
//             new Date().toLocaleString()
//                       .split(', ')[0]
//               + ' 10:00:00 AM')
//           + (new Date().getHours() > 10
//             ? (8.64 * 10**7)
//             : 0);

//       // Clear console
//       process.stdout.write('\x1Bc');
//       console.log(
//         `[${process.pid}]`,
//         'Timeout until',
//         new Date(next_run).toLocaleString()
//                           .split(', ')
//                           .join(' at ')
//       );

//       // Timeout
//       await new Promise(res => setTimeout(res, delay));
//     }
//   }
//   watch();
// } else {
//   if (runCron) {
//     // Fetch as WotC posts events
//     const job = new CronJob('* */30 10-15 * * *', run, null, null, 'America/Chicago');
//     job.start();
//   } else {
//     run();
//   }
// }