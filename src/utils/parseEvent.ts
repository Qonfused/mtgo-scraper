import { database } from '../persistence'
import { IPlayerEntry } from '../types'

function calculateRounds(players: IPlayerEntry[]) {
  const [first, second, third] = players
    .sort((a, b) => b.points - a.points)
    .map(({ points }) => points)

  const wins = first / 3

  let rounds = wins

  if (second === first && third === first) rounds++

  return rounds
}

function calculateRecords(players: IPlayerEntry[]) {
  const rounds = calculateRounds(players)

  players = players.map(player => {
    const wins = player.points / 3
    const losses = rounds - wins

    const record = `${wins}-${losses}`

    return Object.assign(player, { record })
  })

  return { rounds, players }
}

async function parseEvent(event: any, format: string) {
  const players: any = Object.values(await database.fetch('players') || [])

  event = Object.assign(event, calculateRecords(event.players))

  await Promise.all(event.players.map(async ({ deck, url, username }, index: number) => {
    let playerID: string, decks: string[] = []

    const playerExists = players.filter((player: any) => player.username === username)[0]
    if (playerExists) {
      playerID = playerExists.id
      decks = playerExists.decks
    } else {
      const player = await database.push('players', { username })
      playerID = player.id
    }

    const { id: deckID } = await database.push(`${format}/decklists`, {
      player: playerID,
      event: event.id,
      url,
      ...deck
    })

    decks.push(deckID)

    await database.update(`players/${playerID}`, { decks })
    event.players[index] = Object.assign(event.players[index], {
      id: playerID,
      decklist: deckID,
      deck: null,
      url: null,
    })
  }))

  return event
}

export default parseEvent
