import { describe, expect, it } from 'vitest';
import matter from 'gray-matter';
import {
  createDeploymentTransformContext,
  transformAgentMdForDeployment,
} from '../../../../../scripts/lib/emitters/deployment-transform';
import type { AgentInstructionFile } from '../../../../../scripts/lib/emitters/agent-instruction';

const files: AgentInstructionFile[] = [
  {
    id: 'alpha',
    sourcePath: '/pkg/agents/alpha.agent.md',
    relativePath: 'agents/alpha.agent.md',
    content: '---\nname: alpha\nversion: 1.0.0\n---\n',
    isFlow: false,
  },
  {
    id: 'alpha-flow',
    sourcePath: '/pkg/flows/alpha-flow.agent.md',
    relativePath: 'flows/alpha-flow.agent.md',
    content: '---\nname: alpha-flow\nversion: 1.0.0\nagents:\n  - alpha\n---\n',
    isFlow: true,
  },
];

describe('transformAgentMdForDeployment', () => {
  const context = createDeploymentTransformContext('agents-repo', 'target-layouts', files);

  it('rewrites flow agents[] to install leaves for agent references', () => {
    const flowFile = files[1];
    const transformed = transformAgentMdForDeployment(flowFile.content, flowFile, context);
    const parsed = matter(transformed);
    expect(parsed.data.agents).toEqual(['agents-repo--target-layouts--alpha']);
  });

  it('rejects flow agents[] entries that reference flow ids', () => {
    const flowFile = files[1];
    const flowReferencingFlow = matter.stringify('body', {
      name: 'alpha-flow',
      version: '1.0.0',
      agents: ['alpha-flow'],
    });

    expect(() =>
      transformAgentMdForDeployment(flowReferencingFlow, flowFile, context),
    ).toThrow(/references non-agent id alpha-flow/);
  });
});
