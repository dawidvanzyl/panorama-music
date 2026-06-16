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
      { name: 'M1UC46', description: 'Admin creates user and invite URL is displayed' },
      { name: 'M1UC47', description: 'Admin regenerates invite and new URL is displayed' },
      { name: 'M1UC48', description: 'User without valid token is redirected to login' },
      { name: 'M1UC49', description: 'Admin page load fetches and returns all users' },
      { name: 'M1.1UC3', description: 'Password strength checklist updates in real time as user types' },
      { name: 'M1.1UC4', description: 'Form submits without client-side blocking when all rules satisfied' },
    ],
  },
})
