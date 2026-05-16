import fs from 'node:fs';
import path from 'node:path';
import type { AgentDef, UserMetadata } from '../scaffolder';
import type { ParsedArgs } from './args';
import { requireArgValue } from './args';
import type { Template } from './templates';
import { resolveTemplate } from './templates';

export interface CreationRequest {
  packageId: string;
  template: Template;
  metadata: UserMetadata;
  agents: AgentDef[];
  flows: AgentDef[];
}

export type FailFn = (message: string) => never;

function isValidPackageId(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

function packageIdToName(packageId: string): string {
  return packageId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function validateDescription(description: string, fail: FailFn): void {
  if (description.length < 1 || description.length > 300) {
    fail('Description must be 1-300 characters');
  }
}

function validateTags(tags: string[], fail: FailFn): void {
  if (tags.length > 20) {
    fail('Maximum 20 tags allowed');
  }
}

function ensurePackageDoesNotExist(packageId: string, repoRoot: string, fail: FailFn): void {
  const packageDir = path.join(repoRoot, 'packages', packageId);
  if (fs.existsSync(packageDir)) {
    fail(`Package "${packageId}" already exists at ${packageDir}`);
  }
}

function ensureValidEntityId(kind: 'agent' | 'flow', id: string, fail: FailFn): void {
  if (!isValidPackageId(id)) {
    fail(`Invalid ${kind} ID: ${id}. Must be lowercase kebab-case`);
  }
}

function ensureUniqueEntityIds(agents: AgentDef[], flows: AgentDef[], fail: FailFn): void {
  const seen = new Set<string>();

  for (const agent of agents) {
    if (seen.has(agent.id)) {
      fail(`Duplicate ID detected across agents/flows: ${agent.id}`);
    }
    seen.add(agent.id);
  }

  for (const flow of flows) {
    if (seen.has(flow.id)) {
      fail(`Duplicate ID detected across agents/flows: ${flow.id}`);
    }
    seen.add(flow.id);
  }
}

function parseEntitySpec(kind: 'agent' | 'flow', value: string, fail: FailFn): AgentDef {
  const spec = requireArgValue(`--${kind}`, value, fail);
  const parts = spec.split('|');

  if (parts.length !== 3) {
    fail(`--${kind} must be in the format id|name|description`);
  }

  const [idRaw, nameRaw, descriptionRaw] = parts;
  const id = idRaw.trim();
  const name = nameRaw.trim() || id;
  const description = descriptionRaw.trim() || name;

  ensureValidEntityId(kind, id, fail);

  return { id, name, description };
}

function buildMetadataNonInteractive(parsed: ParsedArgs, packageId: string, fail: FailFn): UserMetadata {
  const description = requireArgValue('--description', parsed.description, fail);
  validateDescription(description, fail);

  const owner = parsed.owner?.trim() || 'agents-repo';
  const name = parsed.name?.trim() || packageIdToName(packageId);

  const tags = parsed.tags
    ? parsed.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean)
    : ['agent', 'test'];
  validateTags(tags, fail);

  const homepage = parsed.homepage?.trim() || `https://github.com/${owner}/${packageId}`;
  const repository = parsed.repository?.trim() || `https://github.com/${owner}/${packageId}`;

  const maintainers = parsed.maintainers
    ? parsed.maintainers.split(',').map((maintainer) => maintainer.trim()).filter(Boolean)
    : undefined;

  return {
    name,
    description,
    owner,
    tags,
    homepage,
    repository,
    maintainers,
  };
}

function mergeTemplateAndCustomAgents(template: Template, custom: AgentDef[]): AgentDef[] {
  const merged: AgentDef[] = template.agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.name,
  }));

  const byId = new Map<string, AgentDef>();
  for (const agent of merged) {
    byId.set(agent.id, agent);
  }

  for (const agent of custom) {
    byId.set(agent.id, agent);
  }

  return Array.from(byId.values());
}

export function buildCreationRequest(
  parsed: ParsedArgs,
  repoRoot: string,
  fail: FailFn,
): CreationRequest {
  const packageId = requireArgValue('--package', parsed.packageId, fail);
  if (!isValidPackageId(packageId)) {
    fail(`Invalid package ID: ${packageId}`);
  }
  ensurePackageDoesNotExist(packageId, repoRoot, fail);

  const template = resolveTemplate(requireArgValue('--template', parsed.templateId, fail), fail);
  const metadata = buildMetadataNonInteractive(parsed, packageId, fail);

  const customAgents = parsed.agents.map((agent) => parseEntitySpec('agent', agent, fail));
  const agents = mergeTemplateAndCustomAgents(template, customAgents);
  for (const agent of agents) {
    ensureValidEntityId('agent', agent.id, fail);
  }

  const flows = parsed.flows.map((flow) => parseEntitySpec('flow', flow, fail));
  if (!template.hasFlows && flows.length > 0) {
    fail(`Template ${template.id} does not support flows`);
  }

  ensureUniqueEntityIds(agents, flows, fail);

  return {
    packageId,
    template,
    metadata,
    agents,
    flows,
  };
}
