const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({ testDir: './tests/browser', timeout: 30000, workers: 1, reporter: 'list', use: { headless: true }, outputDir: 'test-results' });
