import { getChatWebDefaultInstruction } from './compatibility';
import {
  buildPkgAgentInstructionPath,
  buildPkgFlowInstructionPath,
} from './chat-web-paths';
import { collectChatWebInclusions, isChatWebIncludedInstruction } from './chat-web-inclusions';
import { SCHEMA_FAMILY_INSTRUCTIONS_MANIFEST } from './constants';
import { ErrorCode, PackageError } from './errors';
import { getSchemaCurrentVersion } from './schema-versions';
import type { DefaultInstructionRef, PackageMetadata, PackageRef } from './types';

export interface InstructionsManifestInstruction {
  kind: 'agent' | 'flow';
  id: string;
  path: string;
  agentInstructions?: string[];
}

export interface InstructionsManifest {
  schemaVersion: string;
  package: string;
  version: string;
  defaultInstruction?: DefaultInstructionRef;
  instructions: InstructionsManifestInstruction[];
}

export interface BuildInstructionsManifestResult {
  manifest: InstructionsManifest;
  includedCount: number;
}

function resolveDefaultInstruction(
  metadata: PackageMetadata,
  packageDir: string,
): DefaultInstructionRef | undefined {
  const defaultRef = getChatWebDefaultInstruction(metadata);
  if (defaultRef === undefined) {
    return undefined;
  }

  const included = collectChatWebInclusions(packageDir, metadata);
  if (!isChatWebIncludedInstruction(included, defaultRef)) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `compatibility.consumption defaultInstruction (${defaultRef.kind}/${defaultRef.id}) ` +
        'must reference an included chat-web instruction',
    );
  }

  return defaultRef;
}

export function buildInstructionsManifest(
  ref: PackageRef,
  packageDir: string,
  metadata: PackageMetadata,
  version: string,
): BuildInstructionsManifestResult | null {
  const included = collectChatWebInclusions(packageDir, metadata);
  if (included.length === 0) {
    return null;
  }

  const instructions: InstructionsManifestInstruction[] = included.map((entry) => {
    const base =
      entry.kind === 'agent'
        ? buildPkgAgentInstructionPath(ref.namespace, ref.packageId, version, entry.id)
        : buildPkgFlowInstructionPath(ref.namespace, ref.packageId, version, entry.id);

    if (entry.kind === 'flow' && entry.agentIds !== undefined && entry.agentIds.length > 0) {
      return {
        kind: entry.kind,
        id: entry.id,
        path: base,
        agentInstructions: entry.agentIds.map((agentId) =>
          buildPkgAgentInstructionPath(ref.namespace, ref.packageId, version, agentId),
        ),
      };
    }

    return { kind: entry.kind, id: entry.id, path: base };
  });

  const defaultInstruction = resolveDefaultInstruction(metadata, packageDir);

  return {
    includedCount: included.length,
    manifest: {
      schemaVersion: getSchemaCurrentVersion(SCHEMA_FAMILY_INSTRUCTIONS_MANIFEST),
      package: ref.qualifiedId,
      version,
      ...(defaultInstruction === undefined ? {} : { defaultInstruction }),
      instructions,
    },
  };
}
