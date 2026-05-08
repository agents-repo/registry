#!/usr/bin/env tsx
/**
 * package-create - Interactive and non-interactive scaffolding for new registry packages.
 *
 * Interactive usage:
 *   npm run package:create
 *   npm run package:create -- --package <id>
 *
 * Non-interactive usage:
 *   npm run package:create -- --non-interactive --package <id> --template <template-id> --description "..."
 *
 * Non-interactive flags:
 *   --non-interactive
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
import { createInterface, Interface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { PackageScaffolder } from './lib/scaffolder';
import type { AgentDef, UserMetadata } from './lib/scaffolder';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

let rl: Interface | undefined;

function ensureReadline(): Interface {
  if (!rl) {
    rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

async function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    ensureReadline().question(question, (answer) => {
      resolve(answer);
    });
  });
}

function closePrompt(): void {
  if (rl) {
    rl.close();
    rl = undefined;
  }
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isValidPackageId(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

function fail(message: string): never {
  console.error(`Error: ${message}`);
  closePrompt();
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
  nonInteractive: boolean;
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
    nonInteractive: false,
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

    if (arg === '--non-interactive') {
      parsed.nonInteractive = true;
      continue;
    }
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
  console.log('Interactive:');
  console.log('  npm run package:create');
  console.log('  npm run package:create -- --package hello-agent');
  console.log('\nNon-interactive (AI/programmatic):');
  console.log('  npm run package:create -- --non-interactive --package hello-agent --template single-agent --description "Hello package"');
  console.log('  npm run package:create -- --non-interactive --package hello-agent --template multi-agent --description "Hello package" --agent custom-agent|Custom Agent|Custom work --flow intake-flow|Intake Flow|Coordinates requests');
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
// Interactive collection
// ---------------------------------------------------------------------------

async function getAndValidatePackageIdInteractive(prefilled?: string): Promise<string> {
  let packageId = prefilled;

  if (!packageId) {
    packageId = await prompt('Enter package ID (kebab-case): ');
  }

  packageId = packageId.trim();

  if (!isValidPackageId(packageId)) {
    fail(`Invalid package ID: "${packageId}". Must be lowercase alphanumeric with hyphens.`);
  }

  ensurePackageDoesNotExist(packageId);
  return packageId;
}

async function selectTemplateInteractive(): Promise<Template> {
  console.log('\n--- Package Templates ---');
  TEMPLATES.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.label}`);
    console.log(`     ${t.description}`);
  });

  const choice = (await prompt('\nSelect template (1-4): ')).trim();
  const index = Number.parseInt(choice, 10) - 1;

  if (index < 0 || index >= TEMPLATES.length) {
    fail('Invalid template selection');
  }

  return TEMPLATES[index];
}

async function collectMetadataInteractive(packageId: string): Promise<UserMetadata> {
  console.log('\n--- Package Metadata ---');

  const name = (await prompt(`Package name [${packageIdToName(packageId)}]: `)).trim() || packageIdToName(packageId);

  const description = (await prompt('Description (1-300 chars): ')).trim();
  validateDescription(description);

  const owner = (await prompt('Owner/Organization [agents-repo]: ')).trim() || 'agents-repo';

  const tagsInput = (await prompt('Tags (comma-separated) [agent,test]: ')).trim();
  const tags = tagsInput
    ? tagsInput.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    : ['agent', 'test'];
  validateTags(tags);

  const homepage = (await prompt(`Homepage [https://github.com/${owner}/${packageId}]: `)).trim() || `https://github.com/${owner}/${packageId}`;

  const repository = (await prompt(`Repository [https://github.com/${owner}/${packageId}]: `)).trim() || `https://github.com/${owner}/${packageId}`;

  const maintainersInput = (await prompt('Maintainers (comma-separated, optional): ')).trim();
  const maintainers = maintainersInput
    ? maintainersInput.split(',').map((m) => m.trim()).filter(Boolean)
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

async function collectAgentsInteractive(initialAgents: Array<{ id: string; name: string }>): Promise<AgentDef[]> {
  const agents: AgentDef[] = [];

  for (const a of initialAgents) {
    const desc = (await prompt(`Description for "${a.name}" agent: `)).trim() || a.name;
    agents.push({ id: a.id, name: a.name, description: desc });
  }

  while (true) {
    const more = (await prompt('\nAdd more agents? (y/n) [n]: ')).trim().toLowerCase();
    if (more !== 'y') break;

    const agentId = (await prompt('Agent ID (kebab-case): ')).trim();
    if (!isValidPackageId(agentId)) {
      console.error('Invalid agent ID');
      continue;
    }

    const agentName = (await prompt('Agent name: ')).trim() || agentId;
    const agentDesc = (await prompt('Description: ')).trim() || agentName;
    agents.push({ id: agentId, name: agentName, description: agentDesc });
  }

  return agents;
}

async function collectFlowsInteractive(hasFlows: boolean): Promise<AgentDef[]> {
  if (!hasFlows) return [];

  const flows: AgentDef[] = [];

  while (true) {
    const more = (await prompt('\nAdd flows? (y/n) [n]: ')).trim().toLowerCase();
    if (more !== 'y') break;

    const flowId = (await prompt('Flow ID (kebab-case): ')).trim();
    if (!isValidPackageId(flowId)) {
      console.error('Invalid flow ID');
      continue;
    }

    const flowName = (await prompt('Flow name: ')).trim() || flowId;
    const flowDesc = (await prompt('Description: ')).trim() || flowName;
    flows.push({ id: flowId, name: flowName, description: flowDesc });
  }

  return flows;
}

// ---------------------------------------------------------------------------
// Non-interactive collection
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

function buildCreationRequestNonInteractive(parsed: ParsedArgs): CreationRequest {
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

async function buildCreationRequestInteractive(parsed: ParsedArgs): Promise<CreationRequest> {
  const packageId = await getAndValidatePackageIdInteractive(parsed.packageId);
  console.log(`Package ID: ${packageId}`);

  const template = await selectTemplateInteractive();
  console.log(`Template: ${template.label}`);

  const metadata = await collectMetadataInteractive(packageId);
  console.log('Metadata collected');

  const agents = await collectAgentsInteractive(template.agents);
  const flows = await collectFlowsInteractive(template.hasFlows);

  ensureUniqueEntityIds(agents, flows);

  return {
    packageId,
    template,
    metadata,
    agents,
    flows,
  };
}

async function confirmInteractive(request: CreationRequest): Promise<boolean> {
  console.log('\n--- Summary ---');
  console.log(`Package ID: ${request.packageId}`);
  console.log(`Name: ${request.metadata.name}`);
  console.log(`Description: ${request.metadata.description}`);
  console.log(`Owner: ${request.metadata.owner}`);
  console.log(`Tags: ${request.metadata.tags.join(', ')}`);
  console.log(`Agents: ${request.agents.map((a) => a.id).join(', ') || '(none)'}`);
  console.log(`Flows: ${request.flows.map((f) => f.id).join(', ') || '(none)'}`);

  const confirm = (await prompt('\nProceed with creation? (y/n) [y]: ')).trim().toLowerCase();
  return confirm !== 'n';
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);

  if (parsed.help) {
    printHelp();
    return;
  }

  console.log('\nCopilot Agents Registry - Package Create\n');

  try {
    let request: CreationRequest;

    if (parsed.nonInteractive) {
      request = buildCreationRequestNonInteractive(parsed);
      console.log('Mode: non-interactive');
    } else {
      request = await buildCreationRequestInteractive(parsed);
      const proceed = await confirmInteractive(request);
      if (!proceed) {
        console.log('Creation cancelled');
        return;
      }
    }

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
  } finally {
    closePrompt();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  closePrompt();
  process.exit(1);
});
