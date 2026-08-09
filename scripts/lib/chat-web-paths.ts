import {
  AGENT_FILE_EXT,
  AGENTS_DIR,
  FLOWS_DIR,
} from './constants';

export function buildPkgAgentInstructionPath(
  namespace: string,
  packageId: string,
  version: string,
  agentId: string,
): string {
  return `/pkg/${namespace}/${packageId}/${version}/${AGENTS_DIR}/${agentId}${AGENT_FILE_EXT}`;
}

export function buildPkgFlowInstructionPath(
  namespace: string,
  packageId: string,
  version: string,
  flowId: string,
): string {
  return `/pkg/${namespace}/${packageId}/${version}/${FLOWS_DIR}/${flowId}${AGENT_FILE_EXT}`;
}

export function buildPkgInstructionsManifestPath(
  namespace: string,
  packageId: string,
  version: string,
): string {
  return `/pkg/${namespace}/${packageId}/${version}/instructions.json`;
}
