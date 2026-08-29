// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Prettier übernimmt die Formatierung (.prettierrc); ESLint prüft nur Regeln.
    'vue/max-attributes-per-line': 'off',
    // Prettier schreibt void-Elemente selbstschließend (<br />); die
    // gegenteilige Vue-Regel würde dagegen arbeiten.
    'vue/html-self-closing': 'off',
    'vue/singleline-html-element-content-newline': 'off',
  },
})
