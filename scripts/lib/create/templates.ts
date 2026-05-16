export interface Template {
  id: string;
  label: string;
  description: string;
  agents: Array<{ id: string; name: string }>;
  hasFlows: boolean;
}

export const TEMPLATES: Template[] = [
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

export type FailFn = (message: string) => never;

export function resolveTemplate(templateIdInput: string | undefined, fail: FailFn): Template {
  const templateId = (templateIdInput || '').trim();
  const template = TEMPLATES.find((candidate) => candidate.id === templateId);
  if (!template) {
    fail(`Invalid --template value: ${templateId || '(empty)'}`);
  }
  return template;
}

export function printCreateHelp(): void {
  console.log('package-create usage:\n');
  console.log('  npm run package:create -- --package hello-agent --template single-agent --description "Hello package"');
  console.log('  npm run package:create -- --package hello-agent --template multi-agent --description "Hello package" --agent custom-agent|Custom Agent|Custom work --flow intake-flow|Intake Flow|Coordinates requests');
  console.log('\nTemplates: single-agent, single-agent-flows, multi-agent, blank');
}
