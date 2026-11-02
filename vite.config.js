import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // local API (see server/): npm --prefix server run dev
    proxy: { '/api': 'http://localhost:5000' },
  },
})
