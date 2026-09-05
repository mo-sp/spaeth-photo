import { defineConfig } from 'vitest/config'

// Schnelle Unit-Tests (`pnpm test`): die Build-Bibliothek unter tests/unit/ und
// die reinen Frontend-Ableitungen, die neben ihrem Modul in
// shared/utils/__tests__/ liegen (Nuxt importiert nur `shared/utils/*` direkt
// automatisch, Unterordner bleiben außen vor). Die Integrationstests unter
// tests/integration/ laufen separat über vitest.integration.config.ts, weil sie
// echte Sharp-Encodes ausführen und dafür Sekunden statt Millisekunden brauchen.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'shared/utils/__tests__/**/*.test.ts'],
    environment: 'node',
  },
})
