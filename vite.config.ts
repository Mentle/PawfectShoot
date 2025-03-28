import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Add base path for GitHub Pages deployment
  // Change this to match your repository name
  // For example, if your repo is "username/pawfect", use "/pawfect/"
  base: '/Pawfect/',
})
