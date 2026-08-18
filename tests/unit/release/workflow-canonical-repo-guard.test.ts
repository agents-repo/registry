import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const workflowsDir = path.join(repoRoot, '.github', 'workflows');
const canonicalRepoGuard = "github.repository == 'agents-repo/registry'";
const releaseJobIds = ['validate', 'release-dry-run', 'release-publish'] as const;
const prWorkflowFiles = [
  'pr-baseline.yml',
  'pr-package-validation.yml',
  'package-create-smoke.yml',
] as const;

const JOB_HEADER_INDENT = '  ';
const JOB_KEY_INDENT = '    ';
const FOLDED_IF_INDENT = '      ';
const NEXT_JOB_HEADER = /^ {2}[a-z0-9-]+:/m;

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const jobBlock = (yaml: string, jobId: string): string => {
  const header = `${JOB_HEADER_INDENT}${jobId}:\n`;
  const start = yaml.indexOf(header);
  if (start < 0) {
    throw new Error(`Missing job ${jobId}`);
  }
  const rest = yaml.slice(start + header.length);
  const nextJobMatch = NEXT_JOB_HEADER.exec(rest);
  if (nextJobMatch === null) {
    return rest;
  }
  return rest.slice(0, nextJobMatch.index);
};

const jobIfExpression = (block: string): string => {
  const lines = block.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (!line.startsWith(`${JOB_KEY_INDENT}if:`)) {
      continue;
    }

    const remainder = line.slice(`${JOB_KEY_INDENT}if:`.length).trim();
    if (remainder !== '>-') {
      return collapseWhitespace(remainder);
    }

    const folded: string[] = [];
    for (let foldedIndex = index + 1; foldedIndex < lines.length; foldedIndex += 1) {
      const foldedLine = lines[foldedIndex] ?? '';
      if (!foldedLine.startsWith(FOLDED_IF_INDENT)) {
        break;
      }
      folded.push(foldedLine.trim());
    }
    return collapseWhitespace(folded.join(' '));
  }

  throw new Error('Missing job-level if');
};

describe('release workflow canonical-repo guard', () => {
  const releaseYaml = readFileSync(path.join(workflowsDir, 'release.yml'), 'utf8');

  it.each(releaseJobIds)('gates %s on agents-repo/registry', (jobId) => {
    const expression = jobIfExpression(jobBlock(releaseYaml, jobId));
    expect(expression).toContain(canonicalRepoGuard);
  });

  it('wraps release-publish push/dispatch OR after the repo check', () => {
    const expression = jobIfExpression(jobBlock(releaseYaml, 'release-publish'));
    expect(expression).toBe(
      `${canonicalRepoGuard} && ((github.event_name == 'push' && github.ref == 'refs/heads/main') || (github.event_name == 'workflow_dispatch' && inputs.dry_run == false && github.ref == 'refs/heads/main'))`,
    );
  });

  it.each(prWorkflowFiles)('does not gate %s on the canonical repository', (fileName) => {
    const yaml = readFileSync(path.join(workflowsDir, fileName), 'utf8');
    expect(yaml).not.toContain('github.repository ==');
  });
});
