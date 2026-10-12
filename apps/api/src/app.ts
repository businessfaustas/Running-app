import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { env } from './env'
import { slotsRouter } from './routes/slots'

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) }))
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })
  app.use('/slots', slotsRouter)

  app.use(errorHandler)
  return app
}
