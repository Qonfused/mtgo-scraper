export type playerID = string
export type decklistID = string

export interface IPlayer {
  id: playerID
  username: string
  decklists: decklistID[]
}

export interface IPlayerEntry {
  id: playerID
  username: string
  decklist: decklistID
  record: string
  points: number
  GWP: number
  OGWP: number
  OMWP: number
  rank: number
}

export type eventID = string

export interface IEvent {
  id: eventID
  name: string
  type: 'preliminary' | 'challenge' | 'premier'
  date: Date
  players: IPlayerEntry[]
  rounds: number
}

export type archetypeID = string
export interface ICard {
  quantity: number
  name: string
  companion?: boolean
}

export interface IDecklist {
  id: decklistID
  url: string
  player: playerID
  event: eventID
  mainboard: ICard[]
  sideboard: ICard[]
}
