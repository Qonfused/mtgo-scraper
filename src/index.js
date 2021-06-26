import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { CronJob } from 'cron';
import scrapeEvent from './scrapeEvent';

const EVENT_FORMATS = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'];
const EVENT_TYPES = [
  'mocs',
  'preliminary',
  'challenge',
  'champs',
  'premier',
  'super-qualifier',
  'players-tour-qualifier',
  'showcase-challenge',
];

// Create date range
const day = 1000 * 60 * 60 * 24;
const offset = day / 4;
const getDates = (startDate, endDate = new Date()) => {
  if (!startDate) return [new Date(new Date().valueOf() - offset)];

  const duration = new Date(endDate) - new Date(startDate);
  const steps = duration / day;

  return Array.from(
    { length: steps + 1 },
    (_, i) => new Date(new Date(startDate).valueOf() + day * i - offset)
  );
};

const runCron = process.argv[2] === 'cron';

const run = async () => {
  try {
    // Create date range and daily event queue
    const dates = getDates(...process.argv.slice(runCron ? 3 : 2));
    const queue = EVENT_FORMATS.map(format =>
      EVENT_TYPES.map(type => ({ format, type }))
    ).flat();

    // Generate events and results
    const events = [];
    const results = [];

    // Scrape events in parallel
    await Promise.all(
      queue.map(async ({ format, type }) => {
        // Fetch dates synchronously to avoid timeout
        for (let i = 0; i < dates.length; i++) {
          const date = dates[i].toISOString().substring(0, 10);
          const uri = `${format}-${type}-${date}`;

          // Scrape by URI
          const data = await scrapeEvent(uri);

          if (data) {
            const { players, ...event } = data;

            events.push(event);
            results.push(...players);

            console.info(chalk.greenBright(`${uri} - Event created`));
          }
        }
      })
    );

    // Write to disk
    writeFileSync(resolve(process.cwd(), 'events.json'), JSON.stringify(events));
    writeFileSync(resolve(process.cwd(), 'results.json'), JSON.stringify(results));

    // Cleanup
    process.exit(0);
  } catch (error) {
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
};

if (runCron) {
  // Fetch as WotC posts events
  const job = new CronJob('* */30 10-15 * * *', run, null, null, 'America/Chicago');
  job.start();
} else {
  run();
}
