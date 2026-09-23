import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl()       // Generates a self-signed cert for the Vite dev server
  ],
  server: {
    port: 5173,
    https: true,     // Serve the frontend over HTTPS
    proxy: {
      '/api': {
        target: 'https://localhost:8443',
        changeOrigin: true,
        secure: false  // Allow self-signed cert from Spring Boot backend
      }
    }
  }
})
