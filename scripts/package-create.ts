#!/usr/bin/env tsx
/**
 * package-create - Args-only scaffolding for new registry packages.
 *
 * Usage:
 *   npm run package:create -- --package <id> --template <template-id> --description "..."
 *
 * Flags:
 *   --package <id>
 *   --template <single-agent|single-agent-flows|multi-agent|blank>
 *   --name <value>
 *   --description <value>
 *   --owner <value>
 *   --tags <comma-separated>
 *   --homepage <url>
 *   --repository <url>
 *   --maintainers <comma-separated>
 *   --agent <id|name|description>     (repeatable)
 *   --flow <id|name|description>      (repeatable)
 *   --help
 *
 * Exits 0 on success, non-zero on failure.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PackageScaffolder } from './lib/scaffolder';
import type { AgentDef, UserMetadata } from './lib/scaffolder';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isValidPackageId(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

interface Template {
  id: string;
  label: string;
  description: string;
  agents: Array<{ id: string; name: string }>;
  hasFlows: boolean;
}

const TEMPLATES: Template[] = [
  {
    id: 'single-agent',
    label: 'Single Agent',
    description: 'Minimal: one agent, no flows directory',
    agents: [{ id: 'main-agent', name: 'Main Agent' }],
    hasFlows: false,
  },
  {
    id: 'single-agent-flows',
    label: 'Single Agent + Flows',
    description: 'One agent with empty flows directory (add flows later)',
    agents: [{ id: 'main-agent', name: 'Main Agent' }],
    hasFlows: true,
  },
  {
    id: 'multi-agent',
    label: 'Multi-Agent Starter',
    description: 'Two pre-generated agents: analyzer and reporter',
    agents: [
      { id: 'analyzer', name: 'Analyzer' },
      { id: 'reporter', name: 'Reporter' },
    ],
    hasFlows: true,
  },
  {
    id: 'blank',
    label: 'Blank Slate',
    description: 'Just structure: you control agents and flows',
    agents: [],
    hasFlows: true,
  },
];

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface ParsedArgs {
  help: boolean;
  packageId?: string;
  templateId?: string;
  name?: string;
  description?: string;
  owner?: string;
  tags?: string;
  homepage?: string;
  repository?: string;
  maintainers?: string;
  agents: string[];
  flows: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const parsed: ParsedArgs = {
    help: false,
    agents: [],
    flows: [],
  };

  const valueHandlers: Record<string, (value: string) => void> = {
    '--package': (value) => {
      parsed.packageId = value;
    },
    '--template': (value) => {
      parsed.templateId = value;
    },
    '--name': (value) => {
      parsed.name = value;
    },
    '--description': (value) => {
      parsed.description = value;
    },
    '--owner': (value) => {
      parsed.owner = value;
    },
    '--tags': (value) => {
      parsed.tags = value;
    },
    '--homepage': (value) => {
      parsed.homepage = value;
    },
    '--repository': (value) => {
      parsed.repository = value;
    },
    '--maintainers': (value) => {
      parsed.maintainers = value;
    },
    '--agent': (value) => {
      parsed.agents.push(value);
    },
    '--flow': (value) => {
      parsed.flows.push(value);
    },
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    const handler = valueHandlers[arg];
    if (handler) {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        fail(`${arg} requires a value`);
      }
      handler(next);
      i += 1;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function requireArgValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith('--')) {
    fail(`${flag} requires a value`);
  }
  return value.trim();
}

function printHelp(): void {
  console.log('package-create usage:\n');
  console.log('  npm run package:create -- --package hello-agent --template single-agent --description "Hello package"');
  console.log('  npm run package:create -- --package hello-agent --template multi-agent --description "Hello package" --agent custom-agent|Custom Agent|Custom work --flow intake-flow|Intake Flow|Coordinates requests');
  console.log('\nTemplates: single-agent, single-agent-flows, multi-agent, blank');
}

// ---------------------------------------------------------------------------
// Mode-normalized models
// ---------------------------------------------------------------------------

interface CreationRequest {
  packageId: string;
  template: Template;
  metadata: UserMetadata;
  agents: AgentDef[];
  flows: AgentDef[];
}

// ---------------------------------------------------------------------------
// Shared resolution and validations
// ---------------------------------------------------------------------------

function packageIdToName(packageId: string): string {
  return packageId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function validateDescription(description: string): void {
  if (description.length < 1 || description.length > 300) {
    fail('Description must be 1-300 characters');
  }
}

function validateTags(tags: string[]): void {
  if (tags.length > 20) {
    fail('Maximum 20 tags allowed');
  }
}

function ensurePackageDoesNotExist(packageId: string): void {
  const repoRoot = path.resolve(scriptDir, '..');
  const packageDir = path.join(repoRoot, 'packages', packageId);
  if (fs.existsSync(packageDir)) {
    fail(`Package "${packageId}" already exists at ${packageDir}`);
  }
}

function resolveTemplate(templateIdInput: string | undefined): Template {
  const templateId = (templateIdInput || '').trim();
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    fail(`Invalid --template value: ${templateId || '(empty)'}`);
  }
  return template;
}

function ensureValidEntityId(kind: 'agent' | 'flow', id: string): void {
  if (!isValidPackageId(id)) {
    fail(`Invalid ${kind} ID: ${id}. Must be lowercase kebab-case`);
  }
}

function ensureUniqueEntityIds(agents: AgentDef[], flows: AgentDef[]): void {
  const seen = new Set<string>();

  for (const a of agents) {
    if (seen.has(a.id)) {
      fail(`Duplicate ID detected across agents/flows: ${a.id}`);
    }
    seen.add(a.id);
  }

  for (const f of flows) {
    if (seen.has(f.id)) {
      fail(`Duplicate ID detected across agents/flows: ${f.id}`);
    }
    seen.add(f.id);
  }
}

// ---------------------------------------------------------------------------
// Args collection
// ---------------------------------------------------------------------------

function parseEntitySpec(kind: 'agent' | 'flow', value: string): AgentDef {
  const spec = requireArgValue(`--${kind}`, value);
  const parts = spec.split('|');

  if (parts.length !== 3) {
    fail(`--${kind} must be in the format id|name|description`);
  }

  const [idRaw, nameRaw, descriptionRaw] = parts;
  const id = idRaw.trim();
  const name = nameRaw.trim() || id;
  const description = descriptionRaw.trim() || name;

  ensureValidEntityId(kind, id);

  return { id, name, description };
}

function buildMetadataNonInteractive(parsed: ParsedArgs, packageId: string): UserMetadata {
  const description = requireArgValue('--description', parsed.description);
  validateDescription(description);

  const owner = parsed.owner?.trim() || 'agents-repo';
  const name = parsed.name?.trim() || packageIdToName(packageId);

  const tags = parsed.tags
    ? parsed.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    : ['agent', 'test'];
  validateTags(tags);

  const homepage = parsed.homepage?.trim() || `https://github.com/${owner}/${packageId}`;
  const repository = parsed.repository?.trim() || `https://github.com/${owner}/${packageId}`;

  const maintainers = parsed.maintainers
    ? parsed.maintainers.split(',').map((m) => m.trim()).filter(Boolean)
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
  const merged: AgentDef[] = template.agents.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.name,
  }));

  const byId = new Map<string, AgentDef>();
  for (const a of merged) byId.set(a.id, a);

  for (const a of custom) {
    byId.set(a.id, a);
  }

  return Array.from(byId.values());
}

function buildCreationRequest(parsed: ParsedArgs): CreationRequest {
  const packageId = requireArgValue('--package', parsed.packageId);
  if (!isValidPackageId(packageId)) {
    fail(`Invalid package ID: ${packageId}`);
  }
  ensurePackageDoesNotExist(packageId);

  const template = resolveTemplate(requireArgValue('--template', parsed.templateId));
  const metadata = buildMetadataNonInteractive(parsed, packageId);

  const customAgents = parsed.agents.map((a) => parseEntitySpec('agent', a));
  const agents = mergeTemplateAndCustomAgents(template, customAgents);
  for (const a of agents) ensureValidEntityId('agent', a.id);

  const flows = parsed.flows.map((f) => parseEntitySpec('flow', f));
  if (!template.hasFlows && flows.length > 0) {
    fail(`Template ${template.id} does not support flows`);
  }

  ensureUniqueEntityIds(agents, flows);

  return {
    packageId,
    template,
    metadata,
    agents,
    flows,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function main(): void {
  const parsed = parseArgs(process.argv);

  if (parsed.help) {
    printHelp();
    return;
  }

  console.log('\nCopilot Agents Registry - Package Create\n');

  try {
    const request = buildCreationRequest(parsed);

    const repoRoot = path.resolve(scriptDir, '..');
    new PackageScaffolder(
      { packageId: request.packageId, metadata: request.metadata, agents: request.agents, flows: request.flows },
      repoRoot,
    ).scaffold();

    console.log('\nPackage created successfully\n');
    console.log(`Location: packages/${request.packageId}/\n`);
    console.log('Next steps:');
    console.log(`  1. npm run package:validate -- --package ${request.packageId}`);
    console.log(`  2. npm run package:build -- --package ${request.packageId}`);
    console.log(`  3. npm run package:build-validate -- --package ${request.packageId}\n`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
