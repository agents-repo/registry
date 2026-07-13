import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { afterEach, describe, expect, it } from 'vitest';
import { AGENTS_DIR, VERSIONS_DIR } from '../../../../scripts/lib/constants';
import { Checksum } from '../../../../scripts/lib/checksum';
import { compareUtf16CodeUnits, ZipBuilder } from '../../../../scripts/lib/zip-builder';
import { createDummyPackage } from '../../../helpers/package-factory';

const tempDirs: string[] = [];

function makeRepoRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-zip-builder-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'packages'), { recursive: true });
  return dir;
}

afterEach((): void => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('ZipBuilder.buildDeploymentZip', (): void => {
  it('writes agent and flow entries under agents/ in sorted id order', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'zip-deploy', {
      agents: [
        { id: 'zebra', name: 'zebra', description: 'Zebra agent for deployment zip ordering.' },
        { id: 'alpha', name: 'alpha', description: 'Alpha agent for deployment zip ordering.' },
      ],
      flows: [
        { id: 'beta-flow', name: 'beta-flow', description: 'Beta flow for deployment zip ordering.' },
      ],
    });

    const zipPath = path.join(repoRoot, 'deployment.zip');
    new ZipBuilder(packageDir, '1.0.0').buildDeploymentZip(zipPath);

    const entries = new AdmZip(zipPath)
      .getEntries()
      .map((entry) => entry.entryName)
      .filter((entryName) => entryName.endsWith('.agent.md'));

    expect(entries).toEqual([
      `${AGENTS_DIR}/alpha.agent.md`,
      `${AGENTS_DIR}/beta-flow.agent.md`,
      `${AGENTS_DIR}/zebra.agent.md`,
    ]);
  });

  it('includes flattened flow content at agents/<flow-id>.agent.md', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'zip-flow', {
      agents: [],
      flows: [
        { id: 'only-flow', name: 'only-flow', description: 'Single flow for deployment zip content.' },
      ],
    });

    const zipPath = path.join(repoRoot, 'deployment.zip');
    new ZipBuilder(packageDir, '1.0.0').buildDeploymentZip(zipPath);

    const entry = new AdmZip(zipPath).getEntry(`${AGENTS_DIR}/only-flow.agent.md`);
    expect(entry).not.toBeNull();
    expect(entry?.getData().toString('utf-8')).toContain('name: only-flow');
  });

  it('produces identical deployment ZIP bytes on repeated builds', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'zip-deterministic-deploy', {
      agents: [
        { id: 'alpha', name: 'alpha', description: 'Alpha agent for deterministic deployment zip bytes.' },
        { id: 'beta', name: 'beta', description: 'Beta agent for deterministic deployment zip bytes.' },
      ],
    });

    const firstPath = path.join(repoRoot, 'deployment-first.zip');
    const secondPath = path.join(repoRoot, 'deployment-second.zip');
    const builder = new ZipBuilder(packageDir, '1.0.0');

    builder.buildDeploymentZip(firstPath);
    builder.buildDeploymentZip(secondPath);

    expect(Checksum.sha256(firstPath)).toBe(Checksum.sha256(secondPath));
  });
});

describe('ZipBuilder.buildSourceZip', (): void => {
  it('includes package files in sorted path order and excludes versions/', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'zip-source', {
      agents: [
        { id: 'alpha', name: 'alpha', description: 'Alpha agent for source zip ordering.' },
      ],
    });
    const versionsDir = path.join(packageDir, VERSIONS_DIR, '1.0.0');
    fs.mkdirSync(versionsDir, { recursive: true });
    fs.writeFileSync(path.join(versionsDir, 'stale.zip'), 'stale');

    const zipPath = path.join(repoRoot, 'source.zip');
    new ZipBuilder(packageDir, '1.0.0').buildSourceZip(zipPath);

    const entryNames = new AdmZip(zipPath)
      .getEntries()
      .map((entry) => entry.entryName)
      .filter((entryName) => !entryName.endsWith('/'));

    expect(entryNames.some((entryName) => entryName.startsWith(`${VERSIONS_DIR}/`))).toBe(false);
    expect(entryNames).toEqual(
      [...entryNames].sort(compareUtf16CodeUnits),
    );
    expect(entryNames.some((entryName) => entryName === 'metadata.json')).toBe(true);
    expect(entryNames.some((entryName) => entryName.startsWith(`${AGENTS_DIR}/`))).toBe(true);
  });

  it('produces identical source ZIP bytes on repeated builds', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'zip-deterministic-source', {
      agents: [
        { id: 'alpha', name: 'alpha', description: 'Alpha agent for deterministic source zip bytes.' },
        { id: 'beta', name: 'beta', description: 'Beta agent for deterministic source zip bytes.' },
      ],
      flows: [
        { id: 'gamma-flow', name: 'gamma-flow', description: 'Gamma flow for deterministic source zip bytes.' },
      ],
    });

    const firstPath = path.join(repoRoot, 'source-first.zip');
    const secondPath = path.join(repoRoot, 'source-second.zip');
    const builder = new ZipBuilder(packageDir, '1.0.0');

    builder.buildSourceZip(firstPath);
    builder.buildSourceZip(secondPath);

    expect(Checksum.sha256(firstPath)).toBe(Checksum.sha256(secondPath));
  });
});
