import type { TestInfo } from '@playwright/test';

/** An application defect or observation documented in docs/FINDINGS.md. */
export interface KnownIssue {
  readonly id: string;
  readonly title: string;
  /** Matches console text produced by this issue, so it can be separated from new errors. */
  readonly consolePattern?: RegExp;
}

const findingsLink = (issue: KnownIssue): string => `docs/FINDINGS.md#${issue.id.toLowerCase()}`;

/** Records the issue on the test so it shows up in the HTML report without failing the run. */
export function annotateKnownIssue(testInfo: TestInfo, issue: KnownIssue, detail = ''): void {
  testInfo.annotations.push({
    type: 'known-issue',
    description: `${issue.id}: ${issue.title}${detail ? ` (${detail})` : ''}. See ${findingsLink(issue)}`,
  });
}

/**
 * Marks the current test as an expected failure caused by a documented application defect.
 * Playwright reports it as "expected to fail"; once the site is fixed the test flips to
 * "unexpected pass", which tells us to close the finding.
 */
export function expectFailureFrom(testInfo: TestInfo, issue: KnownIssue): void {
  testInfo.annotations.push({
    type: 'issue',
    description: `${issue.id}: ${issue.title}. See ${findingsLink(issue)}`,
  });
  testInfo.fail(true, `${issue.id} ${issue.title}`);
}
