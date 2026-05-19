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

// --- Tags count constraint ---
export const TAGS_MAX_COUNT = 20;

// --- License ---
export const LICENSE = 'MIT';

// --- Schema family identifiers ---
export const SCHEMA_FAMILY_PACKAGE = 'metadata.package' as const;
export const SCHEMA_FAMILY_AGENT = 'metadata.agent' as const;
export const SCHEMA_FAMILY_FLOW = 'metadata.flow' as const;
export const SCHEMA_FAMILY_INDEX = 'index' as const;
export const SCHEMA_FAMILY_MANIFEST = 'manifest' as const;

// --- Validation regex patterns ---

/** Package and entity ID format: lowercase kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). */
export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** SHA-256 digest: 64 lowercase hex characters. */
export const SHA256_PATTERN = /^[0-9a-f]{64}$/;
