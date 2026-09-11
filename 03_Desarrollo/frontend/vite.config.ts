import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // <- Añade esta línea
  server: {
    host: true, // Expone el servidor a cualquier IP
    port: 5173 , // Asegura que use este puerto específico
    allowedHosts: ['vscode.utsvps.com', "test.utsvps.com"]
  }
})
