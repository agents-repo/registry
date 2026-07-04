import { describe, expect, it } from 'vitest';
import {
  agentMdToClaudeAgentMd,
  agentMdToSkillMd,
} from '../../../../../scripts/lib/emitters/agent-instruction';

const SAMPLE_AGENT = `---
name: hello-agent
description: A short greeting agent.
version: 1.0.0
license: MIT
tools:
  - read
inputs:
  - name: topic
outputs:
  - name: greeting
---

# Hello

Say hello to the user.
`;

describe('agentMdToSkillMd', (): void => {
  it('converts agent frontmatter into skill format and appends package version comment', (): void => {
    const output = agentMdToSkillMd(SAMPLE_AGENT, '1.0.0');

    expect(output).toContain('name: hello-agent');
    expect(output).toContain('description:');
    expect(output).toContain('Use when the user needs the hello-agent workflow.');
    expect(output).toContain('## Declared capabilities');
    expect(output).toContain('### Tools');
    expect(output).toContain('- read');
    expect(output).toContain('### Inputs');
    expect(output).toContain('- `topic` ()');
    expect(output).toContain('### Outputs');
    expect(output).toContain('- `greeting` ()');
    expect(output).toContain('<!-- agents-repo package version: 1.0.0 -->');
    expect(/^version:/m.exec(output)).toBeNull();
  });

  it('formats named contracts with type and description', (): void => {
    const agent = `---
name: typed-agent
description: Agent with typed contracts for skill conversion tests.
version: 1.0.0
license: MIT
inputs:
  - name: package-blueprint
    type: object
    description: Structured blueprint from analyst.
outputs:
  - name: package-source-tree
    type: object
    description: Authored package source files.
---

# Typed

Body.
`;

    const output = agentMdToSkillMd(agent, '1.0.0');

    expect(output).toContain(
      '- `package-blueprint` (object): Structured blueprint from analyst.',
    );
    expect(output).toContain(
      '- `package-source-tree` (object): Authored package source files.',
    );
  });

  it('falls back to JSON for malformed capability contracts', (): void => {
    const agent = `---
name: malformed-agent
description: Agent with malformed contracts for skill conversion tests.
version: 1.0.0
license: MIT
inputs:
  - legacy-string-input
outputs:
  - type: object
---

# Malformed

Body.
`;

    const output = agentMdToSkillMd(agent, '1.0.0');

    expect(output).toContain('- "legacy-string-input"');
    expect(output).toContain('- {"type":"object"}');
  });
});

describe('agentMdToClaudeAgentMd', (): void => {
  it('removes license from frontmatter while preserving other fields', (): void => {
    const output = agentMdToClaudeAgentMd(SAMPLE_AGENT);

    expect(output).toContain('name: hello-agent');
    expect(output).toContain('version: 1.0.0');
    expect(output).not.toContain('license: MIT');
    expect(output).toContain('# Hello');
  });
});
