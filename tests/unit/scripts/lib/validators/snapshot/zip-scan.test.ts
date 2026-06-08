import type AdmZip from 'adm-zip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  scanSnapshotZip,
  scanTargetArtifactZip,
} from '../../../../../../scripts/lib/validators/snapshot/zip-scan';

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

  it('flags non-canonical case for constrained source root directories', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'Agents/hello-agent.agent.md',
        attr: 0,
        getData: () => Buffer.from('---\nname: hello-agent\n---\n', 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_UNEXPECTED_ENTRY')).toBe(true);
  });

  it('flags wrong-case constrained roots and disallowed payloads together', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'Agents/run.exe',
        attr: 0,
        getData: () => Buffer.from('MZ', 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_UNEXPECTED_ENTRY')).toBe(true);
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

  it('allows non-constrained source paths regardless of file extension', (): void => {
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

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_DISALLOWED_PAYLOAD')).toBe(false);
  });

  it('flags loose .md entries in constrained source paths', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'agents/readme.md',
        attr: 0,
        getData: () => Buffer.from('# Notes', 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_DISALLOWED_PAYLOAD')).toBe(true);
  });

  it('flags loose .json entries in constrained source paths', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'flows/config.json',
        attr: 0,
        getData: () => Buffer.from('{"name":"config"}', 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_DISALLOWED_PAYLOAD')).toBe(true);
  });

  it('flags versions directory entries in source ZIPs', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'versions/1.0.0/1.0.0.zip',
        attr: 0,
        getData: () => Buffer.from('zip', 'utf-8'),
      }),
    ];

    const issues = scanSnapshotZip('mock.zip', {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_VERSIONS_INCLUDED')).toBe(true);
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

describe('scanTargetArtifactZip', (): void => {
  it('accepts Claude Code agent entries with matching frontmatter version', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: '.claude/agents/hello-agent.md',
        attr: 0,
        getData: () => Buffer.from('---\nname: hello-agent\nversion: 1.0.0\n---\n', 'utf-8'),
      }),
    ];

    const issues = scanTargetArtifactZip('mock.zip', 'claude-code', '1.0.0');

    expect(issues).toHaveLength(0);
  });

  it('flags unexpected entries in Cursor skill ZIPs', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: 'agents/hello-agent.agent.md',
        attr: 0,
        getData: () => Buffer.from('---\nname: hello-agent\ndescription: hello\n---\n', 'utf-8'),
      }),
    ];

    const issues = scanTargetArtifactZip('mock.zip', 'cursor', '1.0.0');

    expect(issues.some((issue) => issue.code === 'ERR_ZIP_UNEXPECTED_ENTRY')).toBe(true);
  });

  it('accepts OpenAI Codex skill entries with required frontmatter', (): void => {
    mockEntries = [
      toZipEntry({
        entryName: '.agents/skills/hello-agent/SKILL.md',
        attr: 0,
        getData: () => Buffer.from('---\nname: hello-agent\ndescription: hello\n---\n', 'utf-8'),
      }),
    ];

    const issues = scanTargetArtifactZip('mock.zip', 'openai-codex', '1.0.0');

    expect(issues).toHaveLength(0);
  });
});
