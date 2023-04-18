import fetch from 'node-fetch';
import chalk from 'chalk';
import { JSDOM } from 'jsdom';
// import { setDelay } from 'utils/database';
const setDelay = ms => new Promise(res => setTimeout(res, ms));

/*
* Irregular layouts that don't belong to regular tournament-legal cards.
* Refer to https://scryfall.com/docs/api/layouts for additional layouts.
*/
const ignoredLayouts = [
    'planar',               // Plane and Phenomenon-type cards
    'scheme',               // Scheme-type cards
    'vanguard',             // Vanguard-type cards
    'token',                // Token cards
    'double_faced_token',   // Tokens with another token printed on the back
    'emblem',               // Emblem cards
    'augment',              // Cards with Augment
    'host',                 // Host-type cards
    'art_series',           // Art Series collectable double-faced cards
    'double-sided'          // A Magic card with two sides that are unrelated
];

/**
 * Special set types don't contain regular tournament-legal cards.
 * Refer to https://scryfall.com/docs/api/sets for additional set types.
 */
const ignoredSetTypes = [
    'vanguard',     // Vanguard card sets
    'funny',        // A funny un-set or set with funny promos (Unglued, Happy Holidays, etc)
    'token',        // A set made up of tokens and emblems.
    'memorabilia'   // A set made up of gold-bordered, oversize, or trophy cards that are not legal
];

/**
 * Fetches bulk cards data from Scryfall.
 */
export const fetchBulkData = async (type, catalog_uri) => {
    // Get Scryfall oracle catalog data
    const catalog = await fetch(catalog_uri || `https://api.scryfall.com/bulk-data/${type}`).then(res => res.json());
    // Get oracle card data
    const data = await fetch(catalog.download_uri).then(res => res.json());
    return data;
}

/**
 * Filters non-sanctioned card entries and null card properties.
 */
export const filterCatalog = (data) => {
    return data
        .filter(card => 
            // Exclude extraneous card layouts and set types from non-sanctioned formats
            !ignoredLayouts.includes(card.layout) &&
            !ignoredSetTypes.includes(card.set_type) &&
            // Exclude new cards from previews / etc not yet legal but will be in the future.
            !(card.legalities.future == 'legal' &&
                Object.values(card.legalities).filter(x => x == 'legal').length == 1) &&
            // Remove null card object placeholders for back-halves of double-faced cards.
            !(card.layout != 'normal' && !card.oracle_text && !card.power && !card.loyalty)
        // Alphabetical sort data by cardname
        ).sort((a, b) => a.name.localeCompare(b.name));
}

/*
 * Get list of Scryfall tags.
 */
export const getScryfallTags = async (type='functional') => {
  const response = await fetch('https://scryfall.com/docs/tagger-tags');
  const html = await response.text();
  const { document } = new JSDOM(html).window;

  const sections = Array.from(document.querySelectorAll('div.prose h2'));
  const tags = sections.reduce((output, section) => {
    const sectionType = section.textContent.endsWith('(functional)')
      ? 'functional'
      : 'artwork';

    const links = Array.from(section.nextElementSibling.querySelectorAll('a'));
    links.forEach(({ text, href }) => {
      output.push({
        type: sectionType,
        name: text,
        url: `https://api.scryfall.com/cards${href}`,
      });
    });

    return output.filter(obj => (type?.length ? type.includes(obj.type) : true));
  }, []);

  return tags;
};

const parseTime = (totalSeconds) => {
    let days = Math.floor(totalSeconds / 86400).toFixed(0);
    let hours = Math.floor(totalSeconds / 3600).toFixed(0);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60).toFixed(0);
    let seconds = (totalSeconds % 60).toFixed(0);
    // Create array of these values to later filter out null values
    let formattedArray = totalSeconds.toFixed(0) == 0 ? ['', '', '', '0 seconds'] : [
        days > 0 ? `${ days } ${ (days == 1 ? 'day' : 'days') }` : ``,
        hours > 0 ? `${ hours } ${ (hours == 1 ? 'hour' : 'hours') }` : ``,
        minutes > 0 ? `${ minutes } ${ (minutes == 1 ? 'minute' : 'minutes') }` : ``,
        seconds > 0 ? `${ seconds } ${ (seconds == 1 ? 'second' : 'seconds') }` : ``,
    ];
    return formattedArray
        .filter(Boolean)
        .join(', ')
        // Replace last comma with ' and' for fluency
        .replace(/, ([^,]*)$/, ' and $1');
}

/*
 * Fetch Scryfall tags' data by tag.
 */
export const getTaggedCards = async (_tags, delay=100) => {
    let tags = [];
    const startTime = Date.now();
    for (let i = 0; i < _tags.length; i++) {
        const _tag = _tags[i];

        // Clear console
        process.stdout.write('\x1Bc');
        const _progress = (((i + 1)/_tags.length)*100).toFixed(2);
        console.log(`Scraping '${chalk.yellow(_tag.name)}'...\n${_progress}% complete. (${i + 1}/${_tags.length})`);

        // Get average rate towards completion in nearest days, hours, minutes and seconds
        const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
        const _queueRate = elapsedTime / (i + 1);
        let timeRemaining = parseTime((_tags.length - (i + 1)) * _queueRate);
        console.log(`${timeRemaining} remaining.\n`);

        // Ensure 100 ms delay between requests.
        await setDelay(delay);

        const page = await fetch(_tag.url).then(res => res.json());
        const { has_more, total_cards = 0, data = [] } = page;
        let url = page?.next_page;

        // Handle multiple pages of results.
        if (has_more) {
            const numPages = Math.ceil(total_cards / data.length);
            for (let i = 2; i <= numPages; i++) {
                await setDelay(delay);
                const nextPage = await fetch(url).then(res => res.json());
                url = nextPage.next_page;
                data.push(...nextPage.data);
            }
        }
        tags.push({
            ..._tag,
            count: total_cards,
            data,
        });
    }
    return tags;
}

/**
 * ... array of
 */
 export const getTagsCatalog = async () => {
    // Get list of Scryfall tags.
    const tags = [...new Set(await getScryfallTags())]
        .filter(tag => ['burn', 'removal'].includes(tag.name));
    // Get Scryfall tags data.
    const tagData = await getTaggedCards(tags, 1000);
    const _cards = [...new Set(tagData.map(obj => obj.data).flat(1))];

    const uniqueCards = [...new Map(_cards.map(item => [item.id, item])).values()]
        .map(({ object, oracle_id, name }) => ({
            object,
            name,
            oracle_id,
            tags: tagData
                .map(({ data, name }) =>
                    data.filter(_obj => _obj.oracle_id === oracle_id).length && name
                ).filter(Boolean)
                .flat(1),
        }));
    const uniqueTags = tagData
        .map(({ name, type, url }) => ({
            object: 'tag',
            name,
            type,
            url,
            count: uniqueCards.filter(({ tags }) => tags.includes(name)).length,
            exclusive: uniqueCards.filter(
                ({ tags }) => tags.includes(name) && tags.length === 1
            ).length,
        })).filter(obj => obj.count > 1)
        .sort((a, b) => (a.count < b.count ? 1 : -1));
    
    return uniqueCards
        .map(({tags, ...rest}) => ({
            ...rest,
            tags: tags
                .map(tag => uniqueTags.filter(_obj => _obj.name == tag))
                .flat(1)
        }))
}