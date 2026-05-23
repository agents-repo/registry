import type AdmZip from 'adm-zip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scanSnapshotZip } from '../../../../../../scripts/lib/validators/snapshot/zip-scan';

interface MockZipEntry {
  entryName: string;
  attr: number;
  getData: () => Buffer;
}

let mockEntries: MockZipEntry[] = [];

vi.mock('adm-zip', (): { default: new (_zipPath: string) => { getEntries: () => MockZipEntry[] } } => ({
  default: class {
    getEntries(): MockZipEntry[] {
      return mockEntries;
    }
  },
}));

function toZipEntry(entry: MockZipEntry): AdmZip.IZipEntry {
  return entry as unknown as AdmZip.IZipEntry;
}

beforeEach((): void => {
  mockEntries = [];
});

describe('scanSnapshotZip', (): void => {
  it('flags disallowed file types inside constrained source paths', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'agents/run.exe',
        attr: 0,
        getData: () => Buffer.from('MZ', 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_DISALLOWED_PAYLOAD')).toBe(true);
  });

  it('allows constrained source entries with spec-compliant extensions', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'agents/hello-agent.agent.md',
        attr: 0,
        getData: () => Buffer.from('---\nname: hello-agent\n---\n', 'utf-8'),
      }),
      toZipEntry({
        entryName: 'flows/hello-agents.metadata.json',
        attr: 0,
        getData: () => Buffer.from('{"name":"hello-agents"}', 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_DISALLOWED_PAYLOAD')).toBe(false);
  });

  it('flags disallowed file types outside constrained source paths', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'LICENSE',
        attr: 0,
        getData: () => Buffer.from('MIT', 'utf-8'),
      }),
      toZipEntry({
        entryName: 'docs/notes.txt',
        attr: 0,
        getData: () => Buffer.from('notes', 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_DISALLOWED_PAYLOAD')).toBe(true);
  });

  it('flags path traversal entries', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'agents/../escape.agent.md',
        attr: 0,
        getData: () => Buffer.from('x', 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_TRAVERSAL')).toBe(true);
  });

  it('flags symlink entries', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'agents/hello.agent.md',
        attr: 0o120000 << 16,
        getData: () => Buffer.from('---\nversion: 1.0.0\n---\n', 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_SYMLINK')).toBe(true);
  });

  it('flags case-collision duplicate entries', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'agents/hello.agent.md',
        attr: 0,
        getData: () => Buffer.from('---\nversion: 1.0.0\n---\n', 'utf-8'),
      }),
      toZipEntry({
        entryName: 'agents/Hello.agent.md',
        attr: 0,
        getData: () => Buffer.from('---\nversion: 1.0.0\n---\n', 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_COLLISION')).toBe(true);
  });

  it('flags deployment frontmatter version mismatches', (): void => {
    const content = [
      '---',
      'name: hello-agent',
      'version: 0.9.0',
      'description: hello',
      'license: MIT',
      '---',
    ].join('\n');
    mockEntries = [
      toZipEntry({
        entryName: 'agents/hello-agent.agent.md',
        attr: 0,
        getData: () => Buffer.from(content, 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'deployment',
      expectedVersion: '1.0.0',
    });

    expect(
      issues.some((issue) => issue.code === 'ERR_FRONTMATTER_VERSION_MISMATCH'),
    ).toBe(true);
  });
});
