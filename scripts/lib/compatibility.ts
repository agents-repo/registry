import { PackageError, ErrorCode } from './errors';
import {
  INSTALL_TARGET_IDS,
  CHAT_WEB_CONSUMPTION_ID,
  INSTRUCTIONS_FILENAME,
  ID_PATTERN,
  SHA256_PATTERN,
} from './constants';
import type {
  CompatibilityTarget,
  ConsumptionChannel,
  DefaultInstructionRef,
  InstallTargetIndexEntry,
  ManifestArtifactEntry,
  ManifestVersionEntry,
  PackageCompatibility,
  PackageMetadata,
} from './types';
import {
  isInstallTargetId,
  isInstallTargetStatus,
  isConsumptionChannelId,
  isConsumptionChannelStatus,
  isChatWebEntryValue,
  isInstructionKind,
} from './types';

const DEFAULT_CANONICAL_FORMAT = 'agents-repo.agent-instruction@1.0.0';

const DEFAULT_TARGETS: CompatibilityTarget[] = [
  { id: 'github-copilot', status: 'supported' },
  { id: 'cursor', status: 'supported' },
  { id: 'claude-code', status: 'supported' },
  { id: 'openai-codex', status: 'supported' },
];

function parseCompatibilityObject(value: unknown): PackageCompatibility {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      'metadata.json compatibility must be an object when provided',
    );
  }

  const compatibility = value as Record<string, unknown>;
  const canonicalFormatValue = compatibility['canonicalFormat'];
  const canonicalFormat =
    typeof canonicalFormatValue === 'string' && canonicalFormatValue.trim().length > 0
      ? canonicalFormatValue
      : DEFAULT_CANONICAL_FORMAT;

  const rawTargets = compatibility['targets'];
  if (!Array.isArray(rawTargets) || rawTargets.length === 0) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      'metadata.json compatibility.targets must be a non-empty array',
    );
  }

  const targets: CompatibilityTarget[] = [];
  const seen = new Set<string>();

  for (const entry of rawTargets) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        'metadata.json compatibility.targets entries must be objects',
      );
    }

    const record = entry as Record<string, unknown>;
    const id = record['id'];
    const status = record['status'];

    if (!isInstallTargetId(id)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `metadata.json compatibility.targets id must be one of: ${INSTALL_TARGET_IDS.join(', ')}`,
      );
    }

    if (!isInstallTargetStatus(status)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        'metadata.json compatibility.targets status must be supported, experimental, or planned',
      );
    }

    if (seen.has(id)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `metadata.json compatibility.targets contains duplicate id: ${id}`,
      );
    }

    seen.add(id);
    targets.push({ id, status });
  }

  return { canonicalFormat, targets };
}

function parseDefaultInstruction(
  value: unknown,
  context: string,
): DefaultInstructionRef | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `${context} defaultInstruction must be an object when provided`,
    );
  }

  const record = value as Record<string, unknown>;
  const kind = record['kind'];
  const id = record['id'];

  if (!isInstructionKind(kind)) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `${context} defaultInstruction.kind must be agent or flow`,
    );
  }

  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `${context} defaultInstruction.id must be lowercase kebab-case`,
    );
  }

  return { kind, id };
}

function parseConsumptionChannels(value: unknown): ConsumptionChannel[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      'metadata.json compatibility.consumption must be an array when provided',
    );
  }

  const channels: ConsumptionChannel[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        'metadata.json compatibility.consumption entries must be objects',
      );
    }

    const record = entry as Record<string, unknown>;
    const id = record['id'];
    const status = record['status'];

    if (!isConsumptionChannelId(id)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `metadata.json compatibility.consumption id must be one of: ${CHAT_WEB_CONSUMPTION_ID}`,
      );
    }

    if (!isConsumptionChannelStatus(status)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        'metadata.json compatibility.consumption status must be supported or planned',
      );
    }

    if (seen.has(id)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `metadata.json compatibility.consumption contains duplicate id: ${id}`,
      );
    }

    seen.add(id);
    const channelContext = `metadata.json compatibility.consumption entry "${id}"`;
    const defaultInstruction = parseConsumptionDefaultInstruction(id, record, channelContext);

    if (defaultInstruction !== undefined && status === 'planned') {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `${channelContext}: defaultInstruction requires chat-web status supported`,
      );
    }

    channels.push({
      id,
      status,
      ...(defaultInstruction === undefined ? {} : { defaultInstruction }),
    });
  }

  return channels;
}

function parseConsumptionDefaultInstruction(
  channelId: ConsumptionChannel['id'],
  record: Record<string, unknown>,
  channelContext: string,
): DefaultInstructionRef | undefined {
  if (record['defaultInstruction'] === undefined) {
    return undefined;
  }

  if (channelId !== CHAT_WEB_CONSUMPTION_ID) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `${channelContext}: defaultInstruction is only allowed on chat-web entries`,
    );
  }

  return parseDefaultInstruction(record['defaultInstruction'], channelContext);
}

function parseConsumptionFromObject(compatibility: Record<string, unknown>): ConsumptionChannel[] | undefined {
  return parseConsumptionChannels(compatibility['consumption']);
}

function attachConsumption(
  compatibility: PackageCompatibility,
  raw: Record<string, unknown>,
): PackageCompatibility {
  const consumption = parseConsumptionFromObject(raw);
  if (consumption === undefined) {
    return compatibility;
  }
  return { ...compatibility, consumption };
}

export function parsePackageCompatibility(metadata: PackageMetadata): PackageCompatibility {
  if (metadata.compatibility === undefined) {
    return {
      canonicalFormat: DEFAULT_CANONICAL_FORMAT,
      targets: DEFAULT_TARGETS,
    };
  }

  const raw = metadata.compatibility;
  const parsed = parseCompatibilityObject(raw);
  return attachConsumption(parsed, raw as unknown as Record<string, unknown>);
}

export function isChatWebSupported(metadata: PackageMetadata): boolean {
  const compatibility = parsePackageCompatibility(metadata);
  const channel = compatibility.consumption?.find((entry) => entry.id === CHAT_WEB_CONSUMPTION_ID);
  return channel?.status === 'supported';
}

export function getChatWebDefaultInstruction(
  metadata: PackageMetadata,
): DefaultInstructionRef | undefined {
  const compatibility = parsePackageCompatibility(metadata);
  const channel = compatibility.consumption?.find((entry) => entry.id === CHAT_WEB_CONSUMPTION_ID);
  return channel?.defaultInstruction;
}

export function isChatWebEntryIncluded(
  metadata: PackageMetadata,
  chatWebValue: unknown,
): boolean {
  if (!isChatWebSupported(metadata)) {
    return false;
  }

  if (chatWebValue === undefined) {
    return true;
  }

  if (!isChatWebEntryValue(chatWebValue)) {
    return false;
  }

  if (chatWebValue === 'excluded') {
    return false;
  }

  return chatWebValue === 'included';
}

export function projectChatWebForIndex(
  metadata: PackageMetadata,
  latestVersionEntry: ManifestVersionEntry,
): boolean {
  if (!isChatWebSupported(metadata)) {
    return false;
  }

  const artifact = latestVersionEntry.instructionsArtifact;
  const sha256 = latestVersionEntry.instructionsSha256;

  return (
    artifact === INSTRUCTIONS_FILENAME &&
    typeof sha256 === 'string' &&
    SHA256_PATTERN.test(sha256)
  );
}

export function resolveDeclaredInstallTargets(metadata: PackageMetadata): CompatibilityTarget[] {
  return parsePackageCompatibility(metadata).targets.filter((target) => target.status !== 'planned');
}

export function projectInstallTargetsForIndex(
  metadata: PackageMetadata,
  artifacts: ManifestArtifactEntry[],
): InstallTargetIndexEntry[] {
  const declared = resolveDeclaredInstallTargets(metadata);
  const builtTargets = new Set(artifacts.map((artifact) => artifact.target));

  const projected: InstallTargetIndexEntry[] = [];
  for (const target of declared) {
    if (!builtTargets.has(target.id)) {
      throw new PackageError(
        ErrorCode.ERR_VALIDATION_FAILED,
        `Install target "${target.id}" is declared in compatibility but missing from manifest artifacts`,
      );
    }

    if (target.status !== 'supported' && target.status !== 'experimental') {
      continue;
    }

    projected.push({ id: target.id, status: target.status });
  }

  return projected;
}
