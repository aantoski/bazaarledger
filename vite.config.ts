import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/bazaarledger/',
  test: {
    environment: 'happy-dom', 
    globals: true,            // lets you use describe/it/expect without imports
    // setupFiles: './src/test/setup.ts',
  },
})