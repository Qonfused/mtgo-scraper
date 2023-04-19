import { fetch } from 'undici';
import { JSDOM } from 'jsdom';

import { EVENT_FORMATS } from './constants.js';

export async function getCatalog(dates) {
  const months = [...new Set(dates.map(s => s.slice(0, 7)))];
  return (await Promise.all(months.map(async d => await scrapeCatalog(...d.split(/-/)))))
    .flat(1)
    .sort((a, b) => (new Date(a.date) > new Date(b.date) ? 1 : -1))
    .filter(({ date }) => dates.includes(date));
}

export async function scrapeCatalog(year, month) {
  // Fetch page and create document context
  const catalogURL = `https://www.mtgo.com/en/mtgo/decklists/${year}/${month}`;
  const response = await fetch(catalogURL);
  if (response.status !== 200) throw new Error(response.status);

  // Create document context
  const html = await response.text();
  const { document } = new JSDOM(html).window;

  const uris = Array.from(document.querySelectorAll('a.decklists-link'))
    .map(({ href }) => {
      const uri = href.match(/(?<=decklist\/).*/)?.[0];
      const format = EVENT_FORMATS.filter(f => uri.includes(f))?.[0];
      const type = uri
        .match(/.*?(?=-[\d]{4})/)?.[0]
        .replace(new RegExp(`(${format})[-]?`), '');
      return {
        url: `https://mtgo.com${href}`,
        uri,
        format: format?.charAt(0)?.toUpperCase() + format?.slice(1),
        type: type
          .split('-')
          .filter(s => s.length)
          .map(l => l?.charAt(0)?.toUpperCase() + l?.slice(1))
          .join(' '),
        date: uri.match(/[\d]{4}-[\d]{2}-[\d]{2}/)?.[0],
        eventID: uri.match(/(?<=[\d]{4}-[\d]{2}-[\d]{2}).*/)?.[0],
      };
    })
    .filter(({ type, eventID }) => eventID && type !== 'league');

  return uris;
}

export default scrapeCatalog;
