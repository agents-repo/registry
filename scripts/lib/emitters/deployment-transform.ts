import matter from 'gray-matter';
import type { AgentInstructionFile } from './agent-instruction';
import { computeInstallLeaf } from '../install-leaf';

export interface DeploymentTransformContext {
  readonly namespace: string;
  readonly packageId: string;
  readonly installLeafBySourceId: ReadonlyMap<string, string>;
}

export function createDeploymentTransformContext(
  namespace: string,
  packageId: string,
  files: readonly AgentInstructionFile[],
): DeploymentTransformContext {
  const installLeafBySourceId = new Map<string, string>();
  for (const file of files) {
    installLeafBySourceId.set(file.id, computeInstallLeaf(namespace, packageId, file.id));
  }
  return { namespace, packageId, installLeafBySourceId };
}

export function transformAgentMdForDeployment(
  content: string,
  file: AgentInstructionFile,
  context: DeploymentTransformContext,
): string {
  const installLeaf = context.installLeafBySourceId.get(file.id);
  if (installLeaf === undefined) {
    throw new Error(`Missing install leaf for source id ${file.id}`);
  }

  const parsed = matter(content);
  const data = { ...parsed.data } as Record<string, unknown>;
  data.name = installLeaf;

  if (file.isFlow && Array.isArray(data.agents)) {
    data.agents = data.agents.map((agent) => {
      const sourceAgentId = String(agent);
      const referencedLeaf = context.installLeafBySourceId.get(sourceAgentId);
      if (referencedLeaf === undefined) {
        throw new Error(
          `Flow ${file.id} references unknown agent ${sourceAgentId} in package ${context.namespace}/${context.packageId}`,
        );
      }
      return referencedLeaf;
    });
  }

  return matter.stringify(parsed.content.trim(), data);
}
