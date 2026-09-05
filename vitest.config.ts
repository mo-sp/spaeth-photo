import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Fast unit tests (`pnpm test`): the build library under tests/unit/ and the
// pure derivations that sit next to their module. The alias mirrors Nuxt's `~`
// so the dictionary lookup can be tested without booting Nuxt. The integration
// tests under tests/integration/ run separately, because they perform real
// sharp encodes and take seconds rather than milliseconds.
export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    include: [
      'tests/unit/**/*.test.ts',
      'shared/utils/__tests__/**/*.test.ts',
      'app/**/__tests__/**/*.test.ts',
    ],
    environment: 'node',
  },
})
