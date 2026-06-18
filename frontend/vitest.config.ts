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
      { name: 'M1.1UC9', description: 'Forgot-password page transitions to success state after submission' },
      { name: 'M1.1UC10', description: 'Reset-password page resets password and redirects to login on success' },
      { name: 'M1.1UC11', description: 'Reset-password page shows invalid/expired state for bad token' },
      { name: 'M1.1UC12', description: 'Admin updates user roles via PATCH and receives 200 with updated user' },
      { name: 'M1.1UC13', description: 'Non-admin receives 403 on PATCH /api/users/{userId}' },
      { name: 'M1.1UC14', description: 'Edit button transitions active user row to inline role-checkbox edit mode' },
      { name: 'M1.1UC15', description: 'Saving inline edit sends PATCH and returns row to display mode with updated badges' },
      { name: 'M1.1UC23', description: 'Admin creates user with multiple roles; all roles are persisted' },
      { name: 'M1.1UC24', description: 'Admin selects multiple roles in create-user form; all role badges appear for new user' },
    ],
  },
})
