import type { PackageRef } from './namespace';
import type { AgentInstructionFile } from './emitters/agent-instruction';

/** Current deployment path encoding for install-target ZIP artifacts. */
export const PATH_ENCODING_VERSION = 1;

/** Delimiter between install-leaf segments; MUST NOT appear inside kebab-case ids. */
export const INSTALL_LEAF_SEGMENT_DELIMITER = '--';

export function computeInstallLeaf(
  namespace: string,
  packageId: string,
  sourceId: string,
): string {
  return [namespace, packageId, sourceId].join(INSTALL_LEAF_SEGMENT_DELIMITER);
}

export function buildInstallRef(
  namespace: string,
  packageId: string,
  sourceId: string,
): string {
  return `${namespace}/${packageId}/${sourceId}`;
}

export function buildSourceIdToInstallLeafMap(
  namespace: string,
  packageId: string,
  files: readonly AgentInstructionFile[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const file of files) {
    map.set(file.id, computeInstallLeaf(namespace, packageId, file.id));
  }
  return map;
}

export function cursorSkillZipEntry(
  namespace: string,
  packageId: string,
  installLeaf: string,
): string {
  return `.cursor/skills/${namespace}/${packageId}/${installLeaf}/SKILL.md`;
}

export function codexSkillZipEntry(
  namespace: string,
  packageId: string,
  installLeaf: string,
): string {
  return `.agents/skills/${namespace}/${packageId}/${installLeaf}/SKILL.md`;
}

export function claudeAgentZipEntry(
  namespace: string,
  packageId: string,
  installLeaf: string,
): string {
  return `.claude/agents/${namespace}/${packageId}/${installLeaf}.md`;
}

export function copilotAgentZipEntry(installLeaf: string): string {
  return `agents/${installLeaf}.agent.md`;
}

export function packageRefFromDir(packageDir: string): PackageRef {
  const normalized = packageDir.replaceAll('\\', '/');
  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  if (segments.length < 2) {
    throw new Error(`Cannot derive package ref from directory: ${packageDir}`);
  }
  const packageId = segments.at(-1);
  const namespace = segments.at(-2);
  if (packageId === undefined || namespace === undefined) {
    throw new Error(`Cannot derive package ref from directory: ${packageDir}`);
  }
  return {
    namespace,
    packageId,
    qualifiedId: `${namespace}/${packageId}`,
  };
}
