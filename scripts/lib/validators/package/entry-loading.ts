import path from 'node:path';
import type { ValidationIssue } from '../../types';
import { validateEntryFiles, type EntryVersion } from './entries';

export interface PackageEntries {
  agentEntries: EntryVersion[];
  flowEntries: EntryVersion[];
  allEntries: EntryVersion[];
}

export function loadPackageEntries(
  packageDir: string,
  issues: ValidationIssue[],
): PackageEntries {
  const agentsDir = path.join(packageDir, 'agents');
  const flowsDir = path.join(packageDir, 'flows');

  const agentEntries = validateEntryFiles(agentsDir, 'agents', issues);
  const flowEntries = validateEntryFiles(flowsDir, 'flows', issues);

  return {
    agentEntries,
    flowEntries,
    allEntries: [...agentEntries, ...flowEntries],
  };
}