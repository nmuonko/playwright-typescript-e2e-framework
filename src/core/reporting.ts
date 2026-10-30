import type { TestInfo } from '@playwright/test';
import * as allure from 'allure-js-commons';

const APPLICATIONS: Record<string, string> = {
  faithfulness: 'Faithfulness Home Care',
  afrishop: 'AfriShop',
};

const SUITES: Record<string, string> = {
  ui: 'Functional UI',
  a11y: 'Accessibility',
  api: 'API & HTTP contracts',
  visual: 'Visual regression',
  mobile: 'Mobile journeys',
  perf: 'Performance',
};

/** Splits a project name such as `afrishop-webkit` into application and browser. */
export function describeProject(projectName: string): { application: string; browser: string } {
  const [site = projectName, browser = 'n/a'] = projectName.split('-');
  return { application: APPLICATIONS[site] ?? site, browser };
}

/** Groups Allure results as application → suite type → browser (the default is file-based). */
export async function labelForReports(testInfo: TestInfo): Promise<void> {
  const { application, browser } = describeProject(testInfo.project.name);
  const folder = /tests[\\/][^\\/]+[\\/]([^\\/]+)[\\/]/.exec(testInfo.file)?.[1] ?? '';
  await allure.epic(application);
  await allure.feature(SUITES[folder] ?? folder);
  await allure.parentSuite(application);
  await allure.suite(`${SUITES[folder] ?? folder} · ${browser}`);
  await allure.label('browser', browser);
}
