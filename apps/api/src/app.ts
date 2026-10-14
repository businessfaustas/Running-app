import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { env } from './env'
import { rateLimit } from './rateLimit'
import { slotsRouter } from './routes/slots'

const readLimit = rateLimit({ max: 300, windowMs: 60_000 })
const writeLimit = rateLimit({ max: 30, windowMs: 60_000 })

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // Behind one proxy (e.g. a load balancer), so req.ip is the visitor's address.
  app.set('trust proxy', 1)
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) }))
  app.use(express.json({ limit: '16kb' }))
  app.use((req, res, next) =>
    (req.method === 'GET' || req.method === 'HEAD' ? readLimit : writeLimit)(req, res, next),
  )

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })
  app.use('/slots', slotsRouter)

  app.use(errorHandler)
  return app
}
