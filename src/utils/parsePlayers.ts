import { database } from '../persistence'

async function parsePlayers(event: any, format: string) {
  const players: any = Object.values(await database.fetch('players') || [])

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

    const { id } = await database.push(`${format}/decklists`, {
      player: playerID,
      event: event.id,
      url,
      ...deck
    })

    decks.push(id)

    await database.update(`players/${playerID}`, { decks })
    const stats = event.players[index].stats
    event.players[index] = {
      id: playerID,
      decklist: id,
      ...Object.assign(stats, { username: null })
    }
  }))

  return event
}

export default parsePlayers
