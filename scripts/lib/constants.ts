// Validation constants — single source of truth for all registry constraints.

// --- Status and cost band values ---
export const STATUS_VALUES = ['active', 'deprecated', 'archived', 'yanked'] as const;
export const COST_BANDS = ['minimal', 'low', 'moderate', 'high', 'critical'] as const;
export const PACKAGE_COST_BANDS = ['minimal', 'low', 'moderate', 'high', 'critical', 'mixed'] as const;

// --- Estimated cost range (1–10 relative effort scale) ---
export const ESTIMATED_COST_MIN = 1;
export const ESTIMATED_COST_MAX = 10;

// --- Description length constraints ---
export const DESCRIPTION_MIN_LENGTH = 1;
export const DESCRIPTION_MAX_LENGTH = 300;

// --- Contract constraints ---

export const CONTRACT_NAME_MIN_LENGTH = 1;
export const CONTRACT_NAME_MAX_LENGTH = 64;
export const CONTRACT_NAME_PATTERN = /^[a-z][a-z0-9_-]*$/;
export const CONTRACT_ALLOWED_TYPES = [
  'string',
  'number',
  'boolean',
  'object',
  'array',
] as const;
export const CONTRACT_REQUIRED_KEYS = 'description,name,type';

// --- Tags count constraint ---
export const TAGS_MAX_COUNT = 20;

// --- License ---
export const LICENSE = 'MIT';

// --- GitHub identity patterns ---

export const GITHUB_USER_OR_TEAM_SLUG_PATTERN =
  /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)?$/;

// --- Schema family identifiers ---
export const SCHEMA_FAMILY_PACKAGE = 'metadata.package';
export const SCHEMA_FAMILY_AGENT = 'metadata.agent';
export const SCHEMA_FAMILY_FLOW = 'metadata.flow';
export const SCHEMA_FAMILY_INDEX = 'index';
export const SCHEMA_FAMILY_MANIFEST = 'manifest';

// --- Validation regex patterns ---

/** Package and entity ID format: lowercase kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). */
export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** SHA-256 digest: 64 lowercase hex characters. */
export const SHA256_PATTERN = /^[0-9a-f]{64}$/;

// --- File system names ---

export const AGENT_FILE_EXT = '.agent.md';
export const AGENT_METADATA_EXT = '.metadata.json';

export const AGENTS_DIR = 'agents';
export const FLOWS_DIR = 'flows';
export const VERSIONS_DIR = 'versions';

export const METADATA_FILENAME = 'metadata.json';
export const MANIFEST_FILENAME = 'manifest.json';
export const INDEX_FILENAME = 'index.json';

// --- Archive naming ---

/** Suffix appended to the version string for source archive filenames (e.g. `1.0.0-src.zip`). */
export const SOURCE_ARCHIVE_SUFFIX = '-src.zip';

// --- ZIP security constraints ---

export const ZIP_MAX_ENTRY_NAME_LENGTH = 4096;
/** Mask to extract the full 16-bit Unix mode field from a ZIP entry attribute. */
export const ZIP_UNIX_MODE_MASK = 0xffff;
/** Mask to isolate the file-type field within Unix mode bits. */
export const ZIP_UNIX_TYPE_MASK = 0xf000;
/** Unix file-type value for a symbolic link. */
export const ZIP_SYMLINK_TYPE = 0xa000;

/** File extensions disallowed inside ZIP archives validated by this tooling. */
export const DISALLOWED_ZIP_EXTENSIONS = new Set([
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.sh',
  '.bash',
  '.bat',
  '.cmd',
  '.ps1',
  '.py',
  '.rb',
  '.pl',
  '.php',
  '.jar',
  '.class',
]);

// --- Deployment ZIP entry pattern ---

const escapeRegexLiteral = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAnchoredPatternBody = (pattern: RegExp, patternName: string): string => {
  const { source } = pattern;
  if (!source.startsWith('^') || !source.endsWith('$')) {
    throw new Error(`${patternName} must be anchored with ^ and $ to compose nested regex patterns.`);
  }
  return source.slice(1, -1);
};

/**
 * Valid entry path inside a deployment ZIP:
 * `agents/<id>.agent.md` where `<id>` is a lowercase kebab-case identifier.
 */
export const DEPLOYMENT_ZIP_ENTRY_PATTERN = new RegExp(
  `^${escapeRegexLiteral(AGENTS_DIR)}/${getAnchoredPatternBody(ID_PATTERN, 'ID_PATTERN')}${escapeRegexLiteral(AGENT_FILE_EXT)}$`,
);

// --- Git branch constraints ---

/** Branch names that are always considered protected. */
export const PROTECTED_BRANCH_NAMES = ['main', 'master'] as const;
/** Pattern matching additional protected branch names (e.g. `release/1.0.0`). */
export const PROTECTED_BRANCH_PATTERN = /^release\/.+/;

// --- Scaffold defaults ---

export const INITIAL_VERSION = '1.0.0';
export const DEFAULT_CATEGORY = 'general';
