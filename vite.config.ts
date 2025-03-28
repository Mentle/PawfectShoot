import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Update base path for GitHub Pages deployment
  // Using the correct repository name for mentle's GitHub Pages
  base: './',
})
