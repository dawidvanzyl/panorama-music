import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    tags: [
      { name: 'M1UC35', description: 'Login stores tokens and redirects user' },
      { name: 'M1UC36', description: 'Registration completes and redirects to login' },
      { name: 'M1UC37', description: 'Refresh token stores new tokens' },
      { name: 'M1UC38', description: 'Logout clears tokens from localStorage' },
      { name: 'M1UC39', description: 'isAuthenticated checks token validity' },
    ],
  },
})
