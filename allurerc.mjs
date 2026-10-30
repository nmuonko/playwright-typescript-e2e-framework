import { defineConfig } from 'allure';

// Allure 3 report for both applications. History is carried between CI runs via history.jsonl
// (see scripts/ci/), so trends build up on the published report.
export default defineConfig({
  name: 'Playwright E2E · Faithfulness Home Care & AfriShop',
  output: './allure-report',
  historyPath: './allure-history/history.jsonl',
  historyLimit: 30,
  plugins: {
    awesome: {
      options: {
        reportName: 'Playwright E2E · Faithfulness Home Care & AfriShop',
        singleFile: false,
        reportLanguage: 'en',
        groupBy: ['parentSuite', 'suite', 'subSuite'],
      },
    },
  },
});
