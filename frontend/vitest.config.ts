import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    tags: [
      { name: 'M1UC40', description: 'Login stores tokens and redirects user' },
      { name: 'M1UC41', description: 'Registration completes and redirects to login' },
      { name: 'M1UC42', description: 'Refresh token stores new tokens' },
      { name: 'M1UC43', description: 'Logout clears tokens from localStorage' },
      { name: 'M1UC44', description: 'isAuthenticated checks token validity' },
    ],
  },
})
