import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Use @use to avoid Sass @import deprecation and ensure a trailing newline
        additionalData: `@use "./src/styles/variables.scss" as *;\n`
      }
    }
  }
})
