import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(),tailwindcss()],
  define: {
    __dirname: JSON.stringify(''),
    'process.env': {}
  },
  resolve: {
    alias: {
      path: 'path-browserify',
    }
  }
})