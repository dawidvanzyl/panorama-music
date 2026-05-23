import { isHealthy } from './health.utils.js'

describe('isHealthy', () => {
  it('returns true', () => {
    expect(isHealthy()).toBe(true)
  })
})
