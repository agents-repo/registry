import path from 'node:path';
import { PackageScaffolder, type AgentDef, type ScaffoldRequest, type UserMetadata } from '../../scripts/lib/scaffolder';

export interface DummyPackageOptions {
  namespace?: string;
  description?: string;
  owner?: string;
  tags?: string[];
  homepage?: string;
  repository?: string;
  maintainers?: string[];
  agents?: AgentDef[];
  flows?: AgentDef[];
}

function buildMetadata(packageId: string, options: DummyPackageOptions): UserMetadata {
  const owner = options.owner ?? 'agents-repo';
  return {
    name: packageId,
    description: options.description ?? `Dummy package for ${packageId}`,
    owner,
    tags: options.tags ?? ['smoke'],
    homepage: options.homepage ?? `https://github.com/agents-repo/${packageId}`,
    repository: options.repository ?? `https://github.com/agents-repo/${packageId}`,
    ...(options.maintainers === undefined ? {} : { maintainers: options.maintainers }),
  };
}

function buildRequest(packageId: string, options: DummyPackageOptions): ScaffoldRequest {
  const namespace = options.namespace ?? 'agents-repo';
  return {
    namespace,
    packageId,
    metadata: buildMetadata(packageId, options),
    agents: options.agents ?? [
      {
        id: 'smoke-agent',
        name: 'Smoke Agent',
        description: 'Agent generated for package smoke testing.',
      },
    ],
    flows: options.flows ?? [],
  };
}

export function createDummyPackage(repoRoot: string, packageId: string, options: DummyPackageOptions = {}): string {
  const namespace = options.namespace ?? 'agents-repo';
  new PackageScaffolder(buildRequest(packageId, options), repoRoot).scaffold();
  return path.join(repoRoot, 'packages', namespace, packageId);
}
