import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import { fileURLToPath } from 'node:url';

export type SchemaFamily =
  | 'metadata.package'
  | 'metadata.agent'
  | 'metadata.flow'
  | 'manifest'
  | 'index';

interface SchemaFamilyConfig {
  current: string;
  supported: string[];
  deprecated: string[];
  eol: string[];
}

interface SchemaVersionsRegistry {
  schemaRegistryVersion: string;
  schemas: Record<SchemaFamily, SchemaFamilyConfig>;
}

export type SchemaVersionStatus = 'current' | 'supported' | 'deprecated' | 'eol' | 'unsupported';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const registryPath = path.resolve(scriptDir, '../../specs/schema-versions.json');

const schemaFamilies: SchemaFamily[] = [
  'metadata.package',
  'metadata.agent',
  'metadata.flow',
  'manifest',
  'index',
];

export class SchemaVersionsService {
  private readonly registryFilePath: string;
  private cachedRegistry: SchemaVersionsRegistry | null = null;

  constructor(registryFilePath: string = registryPath) {
    this.registryFilePath = registryFilePath;
  }

  getSchemaCurrentVersion(family: SchemaFamily): string {
    return this.loadRegistry().schemas[family].current;
  }

  getSchemaLifecycle(family: SchemaFamily): SchemaFamilyConfig {
    return this.loadRegistry().schemas[family];
  }

  describeSchemaVersionStatus(
    family: SchemaFamily,
    version: unknown,
  ): { status: SchemaVersionStatus; expected: string[] } {
    const config = this.getSchemaLifecycle(family);
    const expected = config.supported;

    if (typeof version !== 'string') {
      return { status: 'unsupported', expected };
    }
    if (config.eol.includes(version)) {
      return { status: 'eol', expected };
    }
    if (config.deprecated.includes(version)) {
      return { status: 'deprecated', expected };
    }
    if (config.current === version) {
      return { status: 'current', expected };
    }
    if (config.supported.includes(version)) {
      return { status: 'supported', expected };
    }
    return { status: 'unsupported', expected };
  }

  private validateVersionList(label: string, versions: string[]): void {
    if (!Array.isArray(versions)) {
      throw new TypeError(`${label} must be an array`);
    }
    for (const version of versions) {
      if (typeof version !== 'string') {
        throw new TypeError(`${label} contains non-string version: ${JSON.stringify(version)}`);
      }
      if (semver.valid(version) === null) {
        throw new Error(`${label} contains invalid semver: ${JSON.stringify(version)}`);
      }
    }
  }

  private validateFamilyConfig(family: SchemaFamily, config: unknown): void {
    if (typeof config !== 'object' || config === null) {
      throw new TypeError(`Missing schema family config: ${family}`);
    }

    const typedConfig = config as SchemaFamilyConfig;
    if (semver.valid(typedConfig.current) === null) {
      throw new Error(`schemas.${family}.current must be a valid semver`);
    }

    this.validateVersionList(`schemas.${family}.supported`, typedConfig.supported);
    this.validateVersionList(`schemas.${family}.deprecated`, typedConfig.deprecated);
    this.validateVersionList(`schemas.${family}.eol`, typedConfig.eol);

    if (!typedConfig.supported.includes(typedConfig.current)) {
      throw new Error(`schemas.${family}.current must be in schemas.${family}.supported`);
    }
  }

  private loadRegistry(): SchemaVersionsRegistry {
    if (this.cachedRegistry !== null) return this.cachedRegistry;

    const raw = fs.readFileSync(this.registryFilePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('schema-versions.json must be a JSON object');
    }

    const registryCandidate = parsed as {
      schemaRegistryVersion?: unknown;
      schemas?: unknown;
    };

    if (typeof registryCandidate.schemaRegistryVersion !== 'string' || semver.valid(registryCandidate.schemaRegistryVersion) === null) {
      throw new Error('schema-versions.json schemaRegistryVersion must be a valid semver');
    }
    if (typeof registryCandidate.schemas !== 'object' || registryCandidate.schemas === null) {
      throw new Error('schema-versions.json must contain schemas object');
    }

    const registry = registryCandidate as SchemaVersionsRegistry;

    for (const family of schemaFamilies) {
      this.validateFamilyConfig(family, registry.schemas[family]);
    }

    this.cachedRegistry = registry;
    return registry;
  }
}

const defaultSchemaVersionsService = new SchemaVersionsService();

export function getSchemaCurrentVersion(family: SchemaFamily): string {
  return defaultSchemaVersionsService.getSchemaCurrentVersion(family);
}

export function getSchemaLifecycle(family: SchemaFamily): SchemaFamilyConfig {
  return defaultSchemaVersionsService.getSchemaLifecycle(family);
}

export function describeSchemaVersionStatus(
  family: SchemaFamily,
  version: unknown,
): { status: SchemaVersionStatus; expected: string[] } {
  return defaultSchemaVersionsService.describeSchemaVersionStatus(family, version);
}
