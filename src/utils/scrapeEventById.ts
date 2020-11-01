import puppeteer from 'puppeteer'

const scrapeEventById = async (id: string) => {
  if (!id) return null

  try {
    const eventURL = `https://magic.wizards.com/en/articles/archive/mtgo-standings/${id}`
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    await page.setRequestInterception(true)

    page.on('request', (request: any) => {
      if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet')
        request.abort()
      else
        request.continue()
    })

    await page.goto(eventURL)

    const event = await page.evaluate((id: string, eventURL: string) => {
      const standings = []
      const players = []

      const standingEntries = Array.from(document.querySelectorAll('.rankings-table .large-only tbody tr'))
      standingEntries.forEach(entry => {
        const values = Array.from(entry.querySelectorAll('td'))
        const [rank, username, points, OMWP, GWP, OGWP] = values.map(elem => elem.textContent.trim())

        standings.push({
          rank: parseInt(rank),
          username: username.toUpperCase(),
          points: parseInt(points),
          OMWP: parseFloat(OMWP),
          GWP: parseFloat(GWP),
          OGWP: parseFloat(OGWP),
        })
      })

      const deckGroups = Array.from(document.querySelectorAll('.deck-group'))
      deckGroups.forEach(deckGroup => {
        const headerContent = deckGroup.querySelector('h4').innerText

        const username = headerContent.split(' (')[0].toUpperCase()

        const parts = headerContent.split(' (')
        const name = parts[0]
        let chaff = ''
        if (parts[1]) {
          chaff = parts[1]
            .replace(/[^A-Za-z _-]/g, '')
            .replace(/ /g, '_')
            .toLowerCase()
        }

        const url = `${eventURL}#${name
          .replace(/[^A-Za-z _-]/g, '')
          .replace(/ /g, '_')
          .toLowerCase()}${chaff ? '_' + chaff : ''}`

        const mainboardElement = deckGroup.querySelector('.sorted-by-overview-container')
        const sideboardElement = deckGroup.querySelector('.sorted-by-sideboard-container')

        const mainboard = Array.from(mainboardElement.querySelectorAll('.row')).map(cardElement => {
          const name = cardElement.querySelector('.card-name').textContent.trim()
          const count = parseInt(cardElement.querySelector('.card-count').textContent, 10)

          return { name, count }
        })

        const sideboard = Array.from(sideboardElement.querySelectorAll('.row')).map(cardElement => {
          const name = cardElement.querySelector('.card-name').textContent.trim()
          const count = parseInt(cardElement.querySelector('.card-count').textContent, 10)

          return { name, count }
        })

        const deck = { mainboard, sideboard }

        const [stats] = standings.filter(standing => standing.username === username)

        players.push({
          username,
          url,
          deck,
          ...stats,
        })
      })

      const [format, type, wotcID,, date] = document.querySelector('span.deck-meta h5').textContent.trim().split(' ')
      const [month, day, year] = date.split('/')

      return {
        id,
        wotcID: Number(wotcID.replace('#', '')),
        name: `${format} ${type} ${wotcID}`,
        date: `${year}-${month}-${day}`,
        format: format.toLowerCase(),
        type: type.toLowerCase(),
        url: eventURL,
        players,
      }
    }, id, eventURL)

    await browser.close()

    return event
  } catch (error) {
    console.error(error)
  }
}

export default scrapeEventById
