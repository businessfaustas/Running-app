import { listSlotsQuerySchema } from '@grouppace/shared'
import { Router } from 'express'
import { z } from 'zod'
import { listSlots } from '../services/slots'

export const slotsRouter = Router()

/** GET /slots?from=YYYY-MM-DD&to=YYYY-MM-DD[&sport=RUN,TRACK][&lat=..&lng=..&radiusKm=..] */
slotsRouter.get('/', async (req, res) => {
  const parsed = listSlotsQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query', details: z.flattenError(parsed.error) })
    return
  }
  res.json(await listSlots(parsed.data))
})
