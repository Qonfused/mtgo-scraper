import { Router, Request, Response } from 'express'
import { database } from '../persistence'
import { sanitize, scrapeEventById, parseEvent } from '../utils'
import config from '../config'

const router = Router()

router.post('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const [format] = id.split('-')
  const secret = sanitize(req.body.secret)
  if (!secret || secret !== config.secret) return res.sendStatus(401)

  try {
    const eventExists = await database.fetch(`${format}/events/${id}`)
    if (eventExists) return res.status(409).json({ message: `Event: ${id} already exists.` })

    const event = await scrapeEventById(id)
    const eventData = await parseEvent(event, event.format)
    await database.set(`${event.format}/events/${event.id}`, eventData)

    return res.status(200).json(event)
  } catch (error) {
    console.error(`POST /events/${id} >> ${error.stack}`)
    return res.status(500).json({ error: `An error occured while scraping event: ${id}.` })
  }
})

export default router
