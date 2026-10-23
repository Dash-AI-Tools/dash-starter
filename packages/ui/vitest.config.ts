import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * The kit is tested on its own, without the app: the primitives render in
 * jsdom and the stylesheets are read from the package.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
