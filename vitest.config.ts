import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Let tests import the stylesheets as text (`?raw`); Vitest blanks CSS by default.
    css: true,
  },
})
