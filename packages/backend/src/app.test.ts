import { createApp } from './app.js'

describe('GET /health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const app = await createApp()
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })
})
