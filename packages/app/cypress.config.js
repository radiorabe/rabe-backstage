const { defineConfig } = require('cypress')

module.exports = defineConfig({
  fixturesFolder: false,
  retries: 3,
  e2e: {
    setupNodeEvents(on, config) { },
    baseUrl: 'http://localhost:3000',
    supportFile: false,
  },
})
