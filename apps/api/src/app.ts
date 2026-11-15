import cors from 'cors'
import express from 'express'
import { env } from './env'
import { errorHandler, notFound, requestLogger } from './logger'
import { rateLimit } from './rateLimit'
import { slotsRouter } from './routes/slots'

const readLimit = rateLimit({ max: 300, windowMs: 60_000 })
const writeLimit = rateLimit({ max: 30, windowMs: 60_000 })

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // Behind one proxy (e.g. a load balancer), so req.ip is the visitor's address.
  app.set('trust proxy', 1)
  app.use(requestLogger)
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) }))
  app.use(express.json({ limit: '16kb' }))
  app.use((req, res, next) =>
    (req.method === 'GET' || req.method === 'HEAD' ? readLimit : writeLimit)(req, res, next),
  )

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })
  app.use('/slots', slotsRouter)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
