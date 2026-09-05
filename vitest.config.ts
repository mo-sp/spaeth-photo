import { defineConfig } from 'vitest/config'

// Schnelle Unit-Tests (`pnpm test`). Die Integrationstests unter
// tests/integration/ laufen separat über vitest.integration.config.ts, weil sie
// echte Sharp-Encodes ausführen und dafür Sekunden statt Millisekunden brauchen.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
