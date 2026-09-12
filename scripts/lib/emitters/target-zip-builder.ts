import path from 'node:path';
import AdmZip from 'adm-zip';
import { PackageError, ErrorCode } from '../errors';
import {
  buildTargetArtifactFileName,
  INSTALL_TARGET_IDS,
} from '../constants';
import type { InstallTargetId, ManifestArtifactEntry, PackageMetadata } from '../types';
import type { PackageRef } from '../namespace';
import { Checksum } from '../checksum';
import { ZipBuilder } from '../zip-builder';
import { addDeterministicZipEntry } from '../deterministic-zip';
import {
  agentMdToClaudeAgentMd,
  agentMdToSkillMd,
  listAgentInstructionFiles,
} from './agent-instruction';
import { resolveDeclaredInstallTargets } from '../compatibility';
import {
  PATH_ENCODING_VERSION,
  claudeAgentZipEntry,
  codexSkillZipEntry,
  cursorSkillZipEntry,
  packageRefFromDir,
} from '../install-leaf';
import {
  createDeploymentTransformContext,
  transformAgentMdForDeployment,
} from './deployment-transform';

const ZIP_WRITE_OPTIONS = { noSort: true } as const;

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
    pathEncoding: PATH_ENCODING_VERSION,
  };
}

function addZipFile(zip: AdmZip, entryName: string, content: string | Buffer): void {
  addDeterministicZipEntry(zip, entryName, content);
}

function buildGithubCopilotZip(
  packageDir: string,
  outputPath: string,
  version: string,
  ref: PackageRef,
): void {
  const zipBuilder = new ZipBuilder(packageDir, version, ref);
  zipBuilder.buildDeploymentZip(outputPath);
}

function buildClaudeCodeZip(packageDir: string, outputPath: string, ref: PackageRef): void {
  const files = listAgentInstructionFiles(packageDir);
  const context = createDeploymentTransformContext(ref.namespace, ref.packageId, files);
  const zip = new AdmZip(ZIP_WRITE_OPTIONS);
  for (const file of files) {
    const installLeaf = context.installLeafBySourceId.get(file.id)!;
    const transformed = transformAgentMdForDeployment(file.content, file, context);
    const entryName = claudeAgentZipEntry(ref.namespace, ref.packageId, installLeaf);
    addZipFile(zip, entryName, agentMdToClaudeAgentMd(transformed));
  }
  zip.writeZip(outputPath);
}

function buildSkillLayoutZip(
  packageDir: string,
  outputPath: string,
  version: string,
  skillsRoot: string,
  ref: PackageRef,
): void {
  const files = listAgentInstructionFiles(packageDir);
  const context = createDeploymentTransformContext(ref.namespace, ref.packageId, files);
  const zip = new AdmZip(ZIP_WRITE_OPTIONS);
  for (const file of files) {
    const installLeaf = context.installLeafBySourceId.get(file.id)!;
    const transformed = transformAgentMdForDeployment(file.content, file, context);
    const entryName =
      skillsRoot === '.cursor/skills'
        ? cursorSkillZipEntry(ref.namespace, ref.packageId, installLeaf)
        : codexSkillZipEntry(ref.namespace, ref.packageId, installLeaf);
    addZipFile(zip, entryName, agentMdToSkillMd(transformed, version));
  }
  zip.writeZip(outputPath);
}

function buildTargetZip(
  targetId: InstallTargetId,
  packageDir: string,
  outputPath: string,
  version: string,
  ref: PackageRef,
): void {
  switch (targetId) {
    case 'github-copilot':
      buildGithubCopilotZip(packageDir, outputPath, version, ref);
      return;
    case 'claude-code':
      buildClaudeCodeZip(packageDir, outputPath, ref);
      return;
    case 'cursor':
      buildSkillLayoutZip(packageDir, outputPath, version, '.cursor/skills', ref);
      return;
    case 'openai-codex':
      buildSkillLayoutZip(packageDir, outputPath, version, '.agents/skills', ref);
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
  ref?: PackageRef,
): BuiltTargetArtifact[] {
  const packageRef = ref ?? packageRefFromDir(packageDir);
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
    buildTargetZip(target.id, packageDir, absoluteFilePath, version, packageRef);
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
