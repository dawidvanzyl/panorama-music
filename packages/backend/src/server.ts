import 'dotenv/config'
import { createApp } from './app.js'

const PORT = parseInt(process.env.PORT ?? '3000', 10)

async function start() {
  const app = await createApp()

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
