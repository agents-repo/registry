import path from 'node:path';
import AdmZip from 'adm-zip';
import { PackageError, ErrorCode } from '../errors';
import {
  buildTargetArtifactFileName,
  INSTALL_TARGET_IDS,
} from '../constants';
import type { InstallTargetId, ManifestArtifactEntry, PackageMetadata } from '../types';
import { Checksum } from '../checksum';
import { ZipBuilder } from '../zip-builder';
import {
  agentMdToClaudeAgentMd,
  agentMdToSkillMd,
  listAgentInstructionFiles,
} from './agent-instruction';
import { resolveDeclaredInstallTargets } from '../compatibility';

export interface BuiltTargetArtifact {
  target: InstallTargetId;
  file: string;
  sha256: string;
  absoluteFilePath: string;
}

export function toManifestArtifactEntry(artifact: BuiltTargetArtifact): ManifestArtifactEntry {
  return {
    target: artifact.target,
    file: artifact.file,
    sha256: artifact.sha256,
  };
}

function addZipFile(zip: AdmZip, entryName: string, content: string | Buffer): void {
  zip.addFile(entryName, typeof content === 'string' ? Buffer.from(content, 'utf-8') : content);
}

function buildGithubCopilotZip(packageDir: string, outputPath: string, version: string): void {
  const zipBuilder = new ZipBuilder(packageDir, version);
  zipBuilder.buildDeploymentZip(outputPath);
}

function buildClaudeCodeZip(packageDir: string, outputPath: string): void {
  const zip = new AdmZip();
  for (const file of listAgentInstructionFiles(packageDir)) {
    const entryName = `.claude/agents/${file.id}.md`;
    addZipFile(zip, entryName, agentMdToClaudeAgentMd(file.content));
  }
  zip.writeZip(outputPath);
}

function buildSkillLayoutZip(
  packageDir: string,
  outputPath: string,
  version: string,
  skillsRoot: string,
): void {
  const zip = new AdmZip();
  for (const file of listAgentInstructionFiles(packageDir)) {
    const entryName = `${skillsRoot}/${file.id}/SKILL.md`;
    addZipFile(zip, entryName, agentMdToSkillMd(file.content, version));
  }
  zip.writeZip(outputPath);
}

function buildTargetZip(
  targetId: InstallTargetId,
  packageDir: string,
  outputPath: string,
  version: string,
): void {
  switch (targetId) {
    case 'github-copilot':
      buildGithubCopilotZip(packageDir, outputPath, version);
      return;
    case 'claude-code':
      buildClaudeCodeZip(packageDir, outputPath);
      return;
    case 'cursor':
      buildSkillLayoutZip(packageDir, outputPath, version, '.cursor/skills');
      return;
    case 'openai-codex':
      buildSkillLayoutZip(packageDir, outputPath, version, '.agents/skills');
      return;
    default:
      throw new PackageError(
        ErrorCode.ERR_VALIDATION_FAILED,
        `Unsupported install target: ${String(targetId)}`,
      );
  }
}

export function buildTargetArtifacts(
  packageDir: string,
  versionDir: string,
  version: string,
  metadata: PackageMetadata,
): BuiltTargetArtifact[] {
  const declaredTargets = resolveDeclaredInstallTargets(metadata);
  const built: BuiltTargetArtifact[] = [];

  for (const target of declaredTargets) {
    if (!INSTALL_TARGET_IDS.includes(target.id)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `Unknown install target id: ${JSON.stringify(target.id)}`,
      );
    }

    const fileName = buildTargetArtifactFileName(version, target.id);
    const absoluteFilePath = path.join(versionDir, fileName);
    buildTargetZip(target.id, packageDir, absoluteFilePath, version);
    built.push({
      target: target.id,
      file: fileName,
      sha256: Checksum.sha256(absoluteFilePath),
      absoluteFilePath,
    });
  }

  if (built.length === 0) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      'No install targets declared in metadata.json compatibility.targets',
    );
  }

  return built;
}
