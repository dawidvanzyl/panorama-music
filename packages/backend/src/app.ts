import fastify from 'fastify'
import sensible from '@fastify/sensible'

export async function createApp() {
  const app = fastify({ logger: true })

  await app.register(sensible)

  app.get('/health', async (_request, _reply) => {
    return { status: 'ok' }
  })

  return app
}
