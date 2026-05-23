import 'dotenv/config'
import { createApp } from './app.js'

const rawPort = parseInt(process.env.PORT ?? '3000', 10)
const PORT = Number.isNaN(rawPort) ? 3000 : rawPort

async function start() {
  try {
    const app = await createApp()
    await app.listen({ port: PORT, host: '0.0.0.0' })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
