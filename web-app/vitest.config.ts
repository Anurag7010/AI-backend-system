import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envConfig = config({ path: '.env.test' })

export default defineConfig({
  test: {
    // Load test env vars before anything runs
    env: envConfig.parsed || {},
    // Path alias — matches tsconfig @/ imports
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    // Separate pools per test type
    // Repository and API tests run in node — no DOM needed
    environment: 'node',
    globals: true,
    // Run setup before all test files
    setupFiles: [],
    // Increase timeout for DB tests — real queries take longer than mocks
    testTimeout: 15000,
  },
})