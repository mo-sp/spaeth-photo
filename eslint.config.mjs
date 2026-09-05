// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Prettier owns formatting (.prettierrc); ESLint only checks rules.
    'vue/max-attributes-per-line': 'off',
    // Prettier writes void elements self-closing (<br />); the opposite Vue
    // rule would fight it.
    'vue/html-self-closing': 'off',
    'vue/singleline-html-element-content-newline': 'off',
  },
})
