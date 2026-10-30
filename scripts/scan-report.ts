/**
 * Publication gate for generated reports: fails if any file (including files inside zipped traces and the
 * HTML report's embedded data) contains a secret or an unmasked credential.
 *
 *   node scripts/scan-report.ts <dir> [<dir> ...]
 *
 * Tests only ever run against public pages, so a report should contain what any visitor's browser sees.
 * This is the backstop that keeps it that way before anything is published to GitHub Pages.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inflateRawSync } from 'node:zlib';

interface Rule {
  readonly name: string;
  readonly pattern: RegExp;
  /** Credential checks only apply to our own attachments, not to third-party bundles inside traces. */
  readonly attachmentsOnly?: boolean;
  readonly isMatch?: (match: string) => boolean;
}

const decodeJwtRole = (jwt: string): string => {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString()) as {
      role?: string;
    };
    return payload.role ?? '';
  } catch {
    return '';
  }
};

const RULES: readonly Rule[] = [
  { name: 'private key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: 'GitHub token', pattern: /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/g },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'Stripe secret key', pattern: /\b[sr]k_live_[0-9A-Za-z]{16,}\b/g },
  {
    // Publishable "anon" keys are public by design; anything more privileged must never appear.
    name: 'privileged JWT',
    pattern: /\beyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g,
    isMatch: (jwt) => !['', 'anon', 'authenticated'].includes(decodeJwtRole(jwt)),
  },
  {
    name: 'unmasked credential field',
    pattern: /\\?"(password|secret|token|otp)\\?"\s*:\s*\\?"(?!\[redacted\])[^"\\]+/gi,
    attachmentsOnly: true,
  },
];

/** Minimal ZIP reader (central directory + deflate), enough for Playwright traces and report data. */
function* zipEntries(zip: Buffer): Generator<{ name: string; data: Buffer }> {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) return;
  let offset = zip.readUInt32LE(eocd + 16);
  const count = zip.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i++) {
    const method = zip.readUInt16LE(offset + 10);
    const size = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const local = zip.readUInt32LE(offset + 42);
    const name = zip.toString('utf8', offset + 46, offset + 46 + nameLength);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const raw = zip.subarray(start, start + size);
    yield { name, data: method === 8 ? inflateRawSync(raw) : raw };
    offset += 46 + nameLength + extraLength + commentLength;
  }
}

const isZip = (data: Buffer): boolean => data.readUInt32LE(0) === 0x04034b50;
const TEXT = /\.(json|jsonl|html|txt|md|xml|trace|network|stacks|log|js|css|properties)$/i;

export function scan(label: string, data: Buffer, attachment: boolean, findings: string[]): void {
  if (data.length >= 4 && isZip(data)) {
    for (const entry of zipEntries(data)) {
      // Inside a trace, only our own attachments are first-party; resources/ holds the sites' assets.
      scan(
        `${label}!${entry.name}`,
        entry.data,
        attachment && !entry.name.startsWith('resources/'),
        findings,
      );
    }
    return;
  }
  if (!TEXT.test(label) && !label.includes('!')) return;
  const text = data.toString('utf8');
  // The HTML report embeds its data as a base64 ZIP.
  for (const embedded of text.matchAll(/data:application\/zip;base64,([A-Za-z0-9+/=]+)/g)) {
    scan(`${label}#embedded`, Buffer.from(embedded[1] ?? '', 'base64'), attachment, findings);
  }
  for (const rule of RULES) {
    if (rule.attachmentsOnly && !attachment) continue;
    for (const match of text.matchAll(rule.pattern)) {
      if (rule.isMatch && !rule.isMatch(match[0])) continue;
      findings.push(`${rule.name} in ${label}`);
      break;
    }
  }
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const dirs = process.argv.slice(2);
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const findings: string[] = [];
  let files = 0;
  for (const dir of dirs) {
    for (const file of walk(dir)) {
      files += 1;
      // Report pages and app bundles are third-party or generated code; attachments are ours.
      const attachment = !/\.(js|css)$/.test(file);
      scan(file, readFileSync(file), attachment, findings);
    }
  }
  if (findings.length) {
    process.stderr.write(`Refusing to publish: ${findings.length} finding(s)\n${findings.join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write(`Scanned ${files} files in ${dirs.join(', ')}: no secrets or unmasked credentials.\n`);
}
