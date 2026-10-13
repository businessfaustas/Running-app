import { createApp } from './app'
import { queryClient } from './db/client'
import { env } from './env'

const server = createApp().listen(env.PORT, () => {
  console.log(`PaceMates API listening on http://localhost:${env.PORT}`)
})

function shutdown() {
  server.close(() => void queryClient.end())
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
