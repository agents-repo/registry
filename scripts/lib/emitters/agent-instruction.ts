import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { AGENT_FILE_EXT, AGENTS_DIR, FLOWS_DIR } from '../constants';

export interface AgentInstructionFile {
  id: string;
  sourcePath: string;
  relativePath: string;
  content: string;
  isFlow: boolean;
}

export function listAgentInstructionFiles(packageDir: string): AgentInstructionFile[] {
  const files: AgentInstructionFile[] = [];

  const collectFromDir = (dirName: string, isFlow: boolean): void => {
    const dirPath = path.join(packageDir, dirName);
    if (!fs.existsSync(dirPath)) {
      return;
    }

    for (const fileName of fs.readdirSync(dirPath)) {
      if (!fileName.endsWith(AGENT_FILE_EXT)) {
        continue;
      }

      const id = fileName.slice(0, -AGENT_FILE_EXT.length);
      const sourcePath = path.join(dirPath, fileName);
      files.push({
        id,
        sourcePath,
        relativePath: `${dirName}/${fileName}`,
        content: fs.readFileSync(sourcePath, 'utf-8'),
        isFlow,
      });
    }
  };

  collectFromDir(AGENTS_DIR, false);
  collectFromDir(FLOWS_DIR, true);

  return files.sort((left, right) => left.id.localeCompare(right.id));
}

export function agentMdToSkillMd(content: string, packageVersion: string): string {
  const parsed = matter(content);
  const data = parsed.data as Record<string, unknown>;

  const name = typeof data.name === 'string' ? data.name : '';
  let description = typeof data.description === 'string' ? data.description : '';
  if (description.length > 0 && description.length < 120) {
    description = `${description} Use when the user needs the ${name} workflow.`;
  }

  const capabilityLines: string[] = [];
  if (Array.isArray(data.tools) && data.tools.length > 0) {
    capabilityLines.push('### Tools', ...data.tools.map((tool) => `- ${String(tool)}`));
  }
  if (Array.isArray(data.inputs) && data.inputs.length > 0) {
    capabilityLines.push('### Inputs', ...data.inputs.map((input) => `- ${JSON.stringify(input)}`));
  }
  if (Array.isArray(data.outputs) && data.outputs.length > 0) {
    capabilityLines.push('### Outputs', ...data.outputs.map((output) => `- ${JSON.stringify(output)}`));
  }
  if (Array.isArray(data.agents) && data.agents.length > 0) {
    capabilityLines.push('### Referenced agents', ...data.agents.map((agent) => `- ${String(agent)}`));
  }

  let body = parsed.content.trim();
  if (capabilityLines.length > 0) {
    body = `${body}\n\n## Declared capabilities\n\n${capabilityLines.join('\n')}`;
  }

  body = `${body}\n\n<!-- agents-repo package version: ${packageVersion} -->`;

  return matter.stringify(body, { name, description });
}

export function agentMdToClaudeAgentMd(content: string): string {
  const parsed = matter(content);
  const data = { ...parsed.data } as Record<string, unknown>;
  delete data.license;
  return matter.stringify(parsed.content.trim(), data);
}
