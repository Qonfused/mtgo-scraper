/**
 * Gets archetype labels from MTGGoldfish
 */
export const scrapeGoldfish = async (page, { uri, date }) => {
  const _uri = (uri).replace(new RegExp(`(?<=${date}).*`),'');
  const url = `https://www.mtggoldfish.com/tournament/${_uri}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await new Promise(res => setTimeout(res, 100));

  let idx = 0;
  const has_ref = async () => await page.evaluate((uri) => {
    return Array.from(document.querySelectorAll('main.cd-main-content a'))
      .map(e => e.href)
      .filter(l => l.includes(uri))
      ?.[0];
  },uri);
  while (!(await has_ref()) && idx < 5) {
    console.log(`Trying ${url}-${idx+1} fallback...`);
    await page.goto(`${url}-${idx+1}`, { waitUntil: 'domcontentloaded' });
    await new Promise(res => setTimeout(res, 500));
    idx++;
  }
  if (idx && await has_ref()) {
    console.log('Fallback matched expected WotC tournament.');
  } else if (idx) {
    console.log('Failed to find fallback for expected WotC tournament.');
    return;
  }

  const archetypes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('div.deck-display-right-contents table.table:nth-child(2) tr td a[href]'))
      .filter(a => !a?.innerText || !['Total', 'Other'].includes(a?.innerText))
      .map(a => ({
        _displayName: a.innerText,
        uid: parseInt(a.href.split('/archetype/')[1]),
      }))
  );
  if (!archetypes.length) return;

  const players = await page.evaluate(() =>
    Array.from(document.querySelectorAll('div.deck-display-left-contents table.table-tournament tr td a[href]'))
      .reduce((a, b, i, array) => {
        if (i % 3 === 0) a.push(array.slice(i, i + 2));
        return a;
      }, [])
      .filter(p => p[0].innerText !== 'Other')
      .map(p => ({
        _id: parseInt(p[0].getAttribute('href').split('/deck/')[1]),
        player: p[1].innerText,
      }))
  );
  
  // Wait for decklists to load/expand for decklist-specific archetype labels
  let data = [];
  await page.click('a.tournament-decklist-collapse');
  while(!data.length || data.filter(({ archetype }) => !archetype).length) {
    await new Promise(res => setTimeout(res, 50));
    data = await page.evaluate(() =>
      Array.from(document.querySelectorAll('tr.tournament-decklist'))
        .map(e => ({
          id: parseInt(e.getAttribute('data-deckid')),
          archetype: e.querySelector('div.header-left h1.title')
            ?.textContent
            ?.match(/(?<=\n).*/)?.[0],
          displayName: e.querySelector('.deck-container-information')
            ?.textContent
            ?.match(/(?<=\nArchetype:\s+).*/)?.[0]
        }))
    );
  };

  return Object.fromEntries(
    players.map(({ player, _id }) => {
      const { id: deck_uid, archetype, displayName } = data
        .filter(({ id }) => id === _id)[0];
      const archetype_uid = archetypes
        .filter(({ _displayName }) => _displayName === displayName)[0]
        ?.uid;
      return [player, {
        uid: archetype_uid || null,
        alias: (archetype_uid && displayName !== archetype) && [archetype] || [],
        deck_uid: deck_uid || null,
        displayName: archetype_uid && displayName || archetype || null,
      }]
    })
  );
}


export default scrapeGoldfish;