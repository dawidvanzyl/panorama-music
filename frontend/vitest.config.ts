import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    tags: [
      { name: 'M1UC40', description: 'Login stores tokens and redirects user' },
      { name: 'M1UC41', description: 'Registration completes and redirects to login' },
    ],
  },
})
