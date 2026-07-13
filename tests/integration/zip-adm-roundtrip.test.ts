import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { INSTALL_TARGET_IDS } from '../../scripts/lib/constants';
import { buildTargetArtifacts } from '../../scripts/lib/emitters/target-zip-builder';
import type { PackageMetadata } from '../../scripts/lib/types';
import {
  scanSnapshotZip,
  scanTargetArtifactZip,
} from '../../scripts/lib/validators/snapshot/zip-scan';
import { ZipBuilder } from '../../scripts/lib/zip-builder';
import { createDummyPackage } from '../helpers/package-factory';

const tempDirs: string[] = [];

function makeRepoRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-zip-roundtrip-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'packages'), { recursive: true });
  return dir;
}

afterEach((): void => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('adm-zip write/read roundtrip with zip-scan', (): void => {
  it('scans deployment and source ZIPs built by ZipBuilder without mocks', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'zip-roundtrip', {
      agents: [
        { id: 'alpha', name: 'alpha', description: 'Alpha agent for adm-zip roundtrip scanning.' },
      ],
      flows: [
        { id: 'beta-flow', name: 'beta-flow', description: 'Beta flow for adm-zip roundtrip scanning.' },
      ],
    });

    const deploymentZipPath = path.join(repoRoot, 'deployment.zip');
    const sourceZipPath = path.join(repoRoot, 'source.zip');
    const builder = new ZipBuilder(packageDir, '1.0.0');

    builder.buildDeploymentZip(deploymentZipPath);
    builder.buildSourceZip(sourceZipPath);

    const deploymentIssues = scanSnapshotZip(deploymentZipPath, {
      type: 'deployment',
      expectedVersion: '1.0.0',
    });
    const sourceIssues = scanSnapshotZip(sourceZipPath, {
      type: 'source',
      expectedVersion: '1.0.0',
    });

    expect(deploymentIssues).toEqual([]);
    expect(sourceIssues).toEqual([]);
  });

  it('scans install-target artifacts built by buildTargetArtifacts without mocks', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'target-roundtrip', {
      agents: [
        { id: 'alpha', name: 'alpha', description: 'Alpha agent for target artifact roundtrip scanning.' },
      ],
    });
    const metadata = JSON.parse(
      fs.readFileSync(path.join(packageDir, 'metadata.json'), 'utf-8'),
    ) as PackageMetadata;
    const versionDir = path.join(repoRoot, 'versions', '1.0.0');
    fs.mkdirSync(versionDir, { recursive: true });

    const artifacts = buildTargetArtifacts(packageDir, versionDir, '1.0.0', metadata);

    expect(artifacts).toHaveLength(INSTALL_TARGET_IDS.length);

    for (const artifact of artifacts) {
      const issues = scanTargetArtifactZip(
        artifact.absoluteFilePath,
        artifact.target,
        '1.0.0',
      );
      expect(issues).toEqual([]);
    }
  });
});
