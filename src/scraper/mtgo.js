/**
 * Scrapes an event from MTGO standings by URI.
 *
 * @param {String} uri Event URI.
 */
async function scrapeEvent(page, { url, uri, format, type, date, eventID }) {
  // Fetch page and create document context
  const uid = Number(eventID) ?? uri;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await new Promise(res => setTimeout(res, 100));

  const decks = Object.fromEntries(await page.evaluate(() =>
    Array.from(document.querySelectorAll(
      'section.decklist header:nth-child(1) a:nth-child(1)'
    )).map(e => {
      const username = decodeURI(e.href.match(/(?<=#deck_).*/)?.[0]);
      const cards = document.querySelector(`section[id="deck_${username}"] div.decklist-cards-and-preview div:nth-child(1)`)
        .textContent
          .split('\n')
          .map(l => l.trim().match(/(\d+)\s+(.*)/))
          .filter(g => g?.length == 3)
          .map(g => {
            if (g?.[2] === 'Cards') return '$';
            // TODO: rename 'cardName' to 'cardname' in json schema
            return { quantity: Number(g[1]), cardName: g[2] };
          });

      const deck = {
        mainboard: cards.slice(0,cards.indexOf('$')),
        sideboard: cards.slice(1+cards.indexOf('$')),
      };

      return [ username, deck ];
    })
  ));

  const bracket = (await page.evaluate(() =>
    Array.from(document.querySelectorAll('div.decklist-bracket-player'))
      .map(e => e?.textContent.trim()?.split(/[\s]{2}/))
  )).reduce((acc, e, i) => {
    if (i % 2 == 0) return [...acc, { 'player1': e[0], 'record': e[1] }];
    return [ ...acc.slice(0,-1), {...acc.slice(-1)[0], 'player2': e[0] }];
  },[]);

  const top8 = !bracket.length ? {} : {
    [bracket[0]['player1']]: '1st', [bracket[0]['player2']]: '8th',
    [bracket[1]['player1']]: '4th', [bracket[1]['player2']]: '5th',
    [bracket[2]['player1']]: '2nd', [bracket[2]['player2']]: '7th',
    [bracket[3]['player1']]: '3rd', [bracket[3]['player2']]: '6th'
  };

  const standings = Object.fromEntries((await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table.decklist-standings tbody tr'))
      ?.map(e =>
        Array.from(e.querySelectorAll('td'))
          .map(elem => {
            const content = elem.textContent.trim();
            return isNaN(content) ? content : Number(content);
          })
      )?.filter(elem => elem.length == 6);
    if (!rows.length) return [];
    // Calculate rounds by top 3 win ceiling
    const _r = rows.slice(0, 2).sort((a, b) => b[2] - a[2]);
    const extraRound = _r.every(r => r.slice(1)[2] === _r[0][2]);
    const rounds = _r[0][2] / 3 + (extraRound ? 1 : 0);
    // Return updated standings results
    return rows.map(r => [`${r[2] / 3}-${rounds - r[2] / 3}`].concat(r));
  }))?.map(([record, r, username, points, OMWP, GWP, OGWP]) =>
    [username, {record, rank: top8?.[username] || r, points, OMWP, GWP, OGWP}]
  ));

  const players = Object.keys(decks)
    .map(username => ({
      username,
      url: `${url}#deck_${username}`,
      event: uid,
      deck: (decks?.[username] ?? {}),
      stats: (standings?.[username] ?? {}),
      archetype: {}
    }));

  return {
    uid,
    uri,
    format,
    type,
    // Convert yyyy-mm-dd to mm/dd/yyyy format.
    date: (new Date(date)).toLocaleString('en-us').replace(/,.*/,''),
    players,
  };
};


export default scrapeEvent;