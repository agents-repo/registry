import type { ValidationIssue } from '../../types';
import { err } from '../common/issues';
import type { EntryVersion } from './entries';

export function validateHasEntries(
  agentEntries: EntryVersion[],
  flowEntries: EntryVersion[],
  issues: ValidationIssue[],
): void {
  if (agentEntries.length === 0 && flowEntries.length === 0) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        'Package must contain at least one agent (agents/) or flow (flows/)',
      ),
    );
  }
}

export function validateUniqueIdsAcrossEntryTypes(
  agentEntries: EntryVersion[],
  flowEntries: EntryVersion[],
  issues: ValidationIssue[],
): void {
  const agentIds = new Set(agentEntries.map((entry) => entry.id));
  for (const flowEntry of flowEntries) {
    if (agentIds.has(flowEntry.id)) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `ID "${flowEntry.id}" is used in both agents/ and flows/; IDs must be unique across both`,
        ),
      );
    }
  }
}