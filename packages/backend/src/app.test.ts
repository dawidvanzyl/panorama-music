import { createApp } from './app.js'
import type { FastifyInstance } from 'fastify'

describe('GET /health', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 200 with { status: "ok" }', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })
})
