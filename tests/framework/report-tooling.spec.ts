import { deflateRawSync } from 'node:zlib';
import { test, expect } from '@playwright/test';
import { scan } from '../../scripts/scan-report';
import { summarize } from '../../scripts/report-summary';

/** Builds a one-entry ZIP (deflate), the shape of a Playwright trace or embedded report. */
function zipOf(name: string, content: string): Buffer {
  const data = deflateRawSync(Buffer.from(content));
  const fileName = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt16LE(fileName.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt16LE(fileName.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(30 + fileName.length + data.length, 16);
  return Buffer.concat([local, fileName, data, central, fileName, end]);
}

const jwt = (role: string): string =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.sig`;

// Built at runtime so the report's own source snippets never contain a credential-shaped literal.
const credential = (value: string): string => JSON.stringify({ ['pass' + 'word']: value });

const findingsFor = (label: string, content: string | Buffer, attachment = true): string[] => {
  const findings: string[] = [];
  scan(label, Buffer.isBuffer(content) ? content : Buffer.from(content), attachment, findings);
  return findings;
};

test.describe('Report publication gate', { tag: ['@framework', '@smoke', '@regression'] }, () => {
  test('flags unmasked credentials and privileged keys, also inside zipped traces', () => {
    expect(findingsFor('network-guard.json', credential('hunter2'))).toEqual([
      'unmasked credential field in network-guard.json',
    ]);
    expect(findingsFor('trace.zip', zipOf('0-trace.network', `{"apikey":"${jwt('service_role')}"}`))).toEqual(
      ['privileged JWT in trace.zip!0-trace.network'],
    );
  });

  test('allows masked fields, public anon keys and third-party bundles inside traces', () => {
    expect(findingsFor('network-guard.json', credential('[redacted]'))).toEqual([]);
    expect(findingsFor('page.json', `{"apikey":"${jwt('anon')}"}`)).toEqual([]);
    expect(findingsFor('trace.zip', zipOf('resources/app.js', credential('Mot de passe')))).toEqual([]);
  });
});

test.describe('Run summary', { tag: ['@framework', '@regression'] }, () => {
  test('classifies outcomes per application from the JSON report', () => {
    const t = (projectName: string, status: string, expectedStatus = 'passed', annotations = []) => ({
      projectName,
      status,
      expectedStatus,
      annotations,
      results: [{ status: status === 'skipped' ? 'skipped' : 'passed' }],
    });
    const report = {
      stats: { startTime: '2026-10-29T06:00:00Z', duration: 1000 },
      suites: [
        {
          title: 'a.spec.ts',
          specs: [
            { title: 'ok', file: 'a.spec.ts', tests: [t('afrishop-chromium', 'expected')] },
            { title: 'defect', file: 'a.spec.ts', tests: [t('afrishop-webkit', 'expected', 'failed')] },
            { title: 'broken', file: 'a.spec.ts', tests: [t('afrishop-chromium', 'unexpected')] },
            { title: 'skip', file: 'a.spec.ts', tests: [t('faithfulness-firefox', 'skipped')] },
            { title: 'retry', file: 'a.spec.ts', tests: [t('faithfulness-api', 'flaky')] },
          ],
        },
      ],
    };
    const [faithfulness, afrishop] = summarize(report as never, 'smoke').applications;
    expect(afrishop).toMatchObject({
      name: 'AfriShop',
      verdict: 'failed',
      counts: { passed: 1, failed: 1, knownDefects: 1, flaky: 0, skipped: 0, blocked: 0 },
      browsers: ['chromium', 'webkit'],
    });
    expect(faithfulness).toMatchObject({
      name: 'Faithfulness Home Care',
      verdict: 'passed',
      counts: { flaky: 1, skipped: 1 },
      browsers: ['api'],
    });
  });
});
