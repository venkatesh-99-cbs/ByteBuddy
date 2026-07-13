import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // In Docker, VITE_API_TARGET is set to http://backend:5001
  // In local dev, falls back to localhost
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:5001'

  return {
    plugins: [react()],
    server: {
      host: true, // needed for Docker to expose on 0.0.0.0
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        }
      }
    }
  }
})
