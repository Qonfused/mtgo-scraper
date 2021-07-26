import chalk from 'chalk';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

/**
 * Queries a deck element for cards.
 *
 * @param {Element} group Parent group element.
 * @param {String} query Section query.
 */
const queryDeckSection = (group, query) =>
  Array.from(group.querySelectorAll(`${query} .row`)).map(cardElement => {
    const quantity = parseInt(cardElement.querySelector('.card-count').textContent, 10);
    const cardName = cardElement.querySelector('.card-name').textContent.trim();

    return { quantity, cardName };
  });

/**
 * Scrapes an event from MTGO standings by URI.
 *
 * @param {String} uri Event URI.
 */
const scrapeEvent = async uri => {
  try {
    // Fetch page and create document context
    const eventURL = `https://magic.wizards.com/en/articles/archive/mtgo-standings/${uri}`;
    const response = await fetch(eventURL);
    if (response.status !== 200) throw new Error(response.status);

    // Create document context
    const html = await response.text();
    const { document } = new JSDOM(html).window;

    // Get basic event information
    // [format, type, event, , date]
    const groupTitle =
      document
        .querySelector('span.deck-meta h5')
        ?.textContent.replace(/#/g, '')
        .replace(' on', '')
        .trim()
        .split(' ') || [];

      const format = groupTitle[0];
      const date = groupTitle[groupTitle.length - 1];
      const event = groupTitle[groupTitle.length - 2];

      groupTitle.splice(0, 1);
      groupTitle.splice(groupTitle.length - 2, 2);

      const type = groupTitle.join(' ');

    // Early return if no standings available
    const hasStandings = document.querySelector('table.sticky-enabled');
    if (!hasStandings) return;

    // Get player standing stats
    const standings = Array.from(
      document.querySelectorAll('table.sticky-enabled tbody tr')
    ).reduce((output, entry) => {
      const [rank, username, points, OMWP, GWP, OGWP] = Array.from(
        entry.querySelectorAll('td')
      ).map(elem => {
        // Parse numbers if present, otherwise capital string
        const content = elem.textContent.trim();
        return isNaN(content) ? content.toUpperCase() : Number(content);
      });

      // Create standing object
      output.push({ rank, username, points, OMWP, GWP, OGWP });

      return output;
    }, []);

    // Calculate rounds by top 3 win ceiling
    const [first, ...rest] = standings.slice(0, 2).sort((a, b) => b.points - a.points);
    const extraRound = rest.every(({ points }) => points === first.points);
    const winCeil = first.points / 3;
    const rounds = winCeil + (extraRound ? 1 : 0);

    // Parse deck groups for player meta, decks
    const players = Array.from(document.querySelectorAll('.deck-group')).reduce(
      (output, group, i) => {
        // Get basic player information
        const url = `${eventURL}#${group.id}`;
        const username = group.querySelector('h4').textContent.replace(/\s\(.+/, '');

        // Parse container rows for cards
        const mainboard = queryDeckSection(group, '.sorted-by-overview-container');
        const sideboard = queryDeckSection(group, '.sorted-by-sideboard-container');

        // Calculate player stats
        const { points, _rank, OMWP, GWP, OGWP } = standings.find(
          standing => standing.username.toString().toUpperCase() === username.toUpperCase()
        );
        const wins = points / 3;
        const losses = rounds - wins;
        const record = `${wins}-${losses}`;
        // Get rank at index 'i' in standings to correct for shift in results after top 8
        const rank = standings[i].rank;

        // Create player object
        output.push({
          username,
          url,
          event,
          deck: {
            mainboard,
            sideboard,
          },
          stats: {
            record,
            points,
            rank,
            OMWP,
            GWP,
            OGWP,
          },
        });

        return output;
      },
      []
    );

    if (!players?.length) return;

    return {
      uid: event,
      uri,
      format,
      type,
      date,
      players,
    };
  } catch (error) {
    console.error(chalk.red(`Error: ${uri} - ${error.message}`));
  }
};

export default scrapeEvent;
