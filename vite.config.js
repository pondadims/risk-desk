import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During `vercel dev` the /api functions are served on the same origin,
// so no proxy is needed. For plain `npm run dev` the app defaults to
// localStorage (VITE_STORAGE=local) and never calls /api.
export default defineConfig({
  plugins: [react()],
})
