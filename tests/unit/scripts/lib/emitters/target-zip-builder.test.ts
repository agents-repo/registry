import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { afterEach, describe, expect, it } from 'vitest';
import { INSTALL_TARGET_IDS } from '../../../../../scripts/lib/constants';
import { Checksum } from '../../../../../scripts/lib/checksum';
import { buildTargetArtifacts } from '../../../../../scripts/lib/emitters/target-zip-builder';
import type { PackageMetadata } from '../../../../../scripts/lib/types';
import { createDummyPackage } from '../../../../helpers/package-factory';

const tempDirs: string[] = [];

function makeRepoRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-target-zip-builder-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'packages'), { recursive: true });
  return dir;
}

afterEach((): void => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('buildTargetArtifacts', (): void => {
  it('writes one artifact ZIP per declared install target with stable checksums', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'target-artifacts', {
      agents: [
        { id: 'alpha', name: 'alpha', description: 'Alpha agent for target artifact builds.' },
        { id: 'zebra', name: 'zebra', description: 'Zebra agent for target artifact builds.' },
      ],
    });
    const metadata = JSON.parse(
      fs.readFileSync(path.join(packageDir, 'metadata.json'), 'utf-8'),
    ) as PackageMetadata;
    const versionDir = path.join(repoRoot, 'versions', '1.0.0');
    fs.mkdirSync(versionDir, { recursive: true });

    const firstBuild = buildTargetArtifacts(packageDir, versionDir, '1.0.0', metadata);
    const checksumsAfterFirstBuild = firstBuild.map((artifact) => ({
      target: artifact.target,
      sha256: artifact.sha256,
    }));

    for (const artifact of firstBuild) {
      fs.rmSync(artifact.absoluteFilePath, { force: true });
    }

    const secondBuild = buildTargetArtifacts(packageDir, versionDir, '1.0.0', metadata);
    const checksumsAfterSecondBuild = secondBuild.map((artifact) => ({
      target: artifact.target,
      sha256: artifact.sha256,
    }));

    expect(firstBuild).toHaveLength(INSTALL_TARGET_IDS.length);
    expect(checksumsAfterSecondBuild).toEqual(checksumsAfterFirstBuild);
  });

  it('writes Claude and skill layout entries for non-github-copilot targets', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'target-layouts', {
      agents: [
        { id: 'alpha', name: 'alpha', description: 'Alpha agent for install-target layout checks.' },
      ],
    });
    const metadata = JSON.parse(
      fs.readFileSync(path.join(packageDir, 'metadata.json'), 'utf-8'),
    ) as PackageMetadata;
    const versionDir = path.join(repoRoot, 'versions', '1.0.0');
    fs.mkdirSync(versionDir, { recursive: true });

    const artifacts = buildTargetArtifacts(packageDir, versionDir, '1.0.0', metadata);
    const byTarget = new Map(artifacts.map((artifact) => [artifact.target, artifact]));

    const claudeZip = new AdmZip(byTarget.get('claude-code')!.absoluteFilePath);
    expect(
      claudeZip.getEntries().map((entry) => entry.entryName).filter((name) => !name.endsWith('/')),
    ).toEqual(['.claude/agents/alpha.md']);

    const cursorZip = new AdmZip(byTarget.get('cursor')!.absoluteFilePath);
    expect(
      cursorZip.getEntries().map((entry) => entry.entryName).filter((name) => !name.endsWith('/')),
    ).toEqual(['.cursor/skills/alpha/SKILL.md']);

    const codexZip = new AdmZip(byTarget.get('openai-codex')!.absoluteFilePath);
    expect(
      codexZip.getEntries().map((entry) => entry.entryName).filter((name) => !name.endsWith('/')),
    ).toEqual(['.agents/skills/alpha/SKILL.md']);

    expect(Checksum.sha256(byTarget.get('github-copilot')!.absoluteFilePath)).toHaveLength(64);
  });
});
