import { writeFileSync } from 'fs';
import { resolve } from 'path';
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

const day = 1000 * 60 * 60 * 24;

const getDates = (startDate, endDate = new Date()) => {
  if (!startDate) return [new Date()];

  const duration = new Date(endDate) - new Date(startDate);
  const steps = duration / day;

  return Array.from(
    { length: steps + 1 },
    (_, i) => new Date(new Date(startDate).valueOf() + day * i)
  );
};

(async () => {
  const dates = getDates(...process.argv.slice(2));
  const queue = EVENT_FORMATS.map(format =>
    EVENT_TYPES.map(type => ({ format, type }))
  ).flat();

  const events = queue.reduce((output, { format, type }) => {
    if (!output[format]) output[format] = {};
    if (!output[format][type]) output[format][type] = [];

    return output;
  }, {});

  await Promise.all(
    queue.map(async ({ format, type }) => {
      // Fetch dates synchronously to avoid timeout
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i].toISOString().substring(0, 10);

        const uri = `${format}-${type}-${date}`;
        const event = await scrapeEvent(uri);

        if (event) events[format][type].push(event);
      }
    })
  );

  writeFileSync(resolve(process.cwd(), 'data.json'), JSON.stringify(events));
})();
