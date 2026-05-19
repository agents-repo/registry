import fs from 'node:fs';
import path from 'node:path';
import { getSchemaCurrentVersion } from './schema-versions';
import type { PackageMetadata } from './types';
import { LICENSE, SCHEMA_FAMILY_PACKAGE, SCHEMA_FAMILY_AGENT, SCHEMA_FAMILY_FLOW } from './constants';

export interface AgentDef {
  id: string;
  name: string;
  description: string;
}

export interface UserMetadata {
  name: string;
  description: string;
  owner: string;
  tags: string[];
  homepage: string;
  repository: string;
  maintainers?: string[];
}

export interface ScaffoldRequest {
  packageId: string;
  metadata: UserMetadata;
  agents: AgentDef[];
  flows: AgentDef[];
}

export class PackageScaffolder {
  private readonly request: ScaffoldRequest;
  private readonly repoRoot: string;

  constructor(request: ScaffoldRequest, repoRoot: string) {
    this.request = request;
    this.repoRoot = repoRoot;
  }

  scaffold(): void {
    const { packageId, metadata, agents, flows } = this.request;
    const packageDir = path.join(this.repoRoot, 'packages', packageId);

    fs.mkdirSync(path.join(packageDir, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(packageDir, 'flows'), { recursive: true });
    fs.mkdirSync(path.join(packageDir, 'versions'), { recursive: true });

    const packageSchemaVersion = getSchemaCurrentVersion(SCHEMA_FAMILY_PACKAGE);
    const agentMetadataSchemaVersion = getSchemaCurrentVersion(SCHEMA_FAMILY_AGENT);
    const flowMetadataSchemaVersion = getSchemaCurrentVersion(SCHEMA_FAMILY_FLOW);

    const now = new Date().toISOString();
    const packageReadmeUrl = `https://github.com/agents-repo/registry/blob/main/packages/${packageId}/README.md`;
    const packageMetadata: PackageMetadata = {
      schemaVersion: packageSchemaVersion,
      name: packageId,
      description: metadata.description,
      owner: metadata.owner,
      license: LICENSE,
      homepage: metadata.homepage,
      repository: metadata.repository,
      tags: metadata.tags,
      createdAt: now,
      updatedAt: now,
      version: '1.0.0',
      status: 'active',
      category: 'general',
      estimateOverallCost: {
        band: 'mixed',
      },
      quickstart: packageReadmeUrl,
      ...(metadata.maintainers && { maintainers: metadata.maintainers }),
    };

    fs.writeFileSync(
      path.join(packageDir, 'metadata.json'),
      JSON.stringify(packageMetadata, null, 4) + '\n',
      'utf-8',
    );

    fs.writeFileSync(
      path.join(packageDir, 'README.md'),
      this.generatePackageReadme(packageId, metadata.description),
      'utf-8',
    );

    for (const agent of agents) {
      fs.writeFileSync(
        path.join(packageDir, 'agents', `${agent.id}.agent.md`),
        this.generateAgentMarkdown(agent.id, agent.description),
        'utf-8',
      );
      fs.writeFileSync(
        path.join(packageDir, 'agents', `${agent.id}.metadata.json`),
        JSON.stringify(this.generateAgentMetadata(agent.id, agent.description, agentMetadataSchemaVersion), null, 4) + '\n',
        'utf-8',
      );
    }

    for (const flow of flows) {
      fs.writeFileSync(
        path.join(packageDir, 'flows', `${flow.id}.agent.md`),
        this.generateAgentMarkdown(flow.id, flow.description),
        'utf-8',
      );
      fs.writeFileSync(
        path.join(packageDir, 'flows', `${flow.id}.metadata.json`),
        JSON.stringify(this.generateAgentMetadata(flow.id, flow.description, flowMetadataSchemaVersion), null, 4) + '\n',
        'utf-8',
      );
    }
  }

  private generateAgentMarkdown(id: string, description: string): string {
    return `---
name: ${id}
description: ${description}
version: 1.0.0
license: MIT
---

# Overview

${description}

## Responsibilities

- Primary responsibility placeholder
- Secondary responsibility placeholder

## Constraints

- Constraint or limitation placeholder

## Interaction Contract

Input: Describe expected input type or format
Output: Describe expected output type or format
`;
  }

  private generatePackageReadme(packageId: string, description: string): string {
    return `# ${packageId}

${description}

## Quickstart

Use this package as a starting point for agents and flows in the registry.

## Package Contents

- Agents and flows under this package root
- Metadata contract in \`metadata.json\`

## Usage

Run build and validation commands from the repository root:

\`\`\`bash
npm run package:build -- --package ${packageId}
npm run package:validate-artifacts -- --package ${packageId} --version 1.0.0
\`\`\`

The build script automatically runs preflight validation before generating
artifacts.
`;
  }

  private generateAgentMetadata(id: string, description: string, schemaVersion: string): object {
    return {
      schemaVersion,
      name: id,
      description,
      license: LICENSE,
      status: 'active',
      category: 'general',
      estimateCost: {
        estimatedCost: 1,
        band: 'medium',
      },
    };
  }
}
