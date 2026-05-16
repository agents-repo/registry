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
      throw new Error(`${label} must be an array`);
    }
    for (const version of versions) {
      if (typeof version !== 'string' || !semver.valid(version)) {
        throw new Error(`${label} contains invalid semver: ${JSON.stringify(version)}`);
      }
    }
  }

  private validateFamilyConfig(family: SchemaFamily, config: SchemaFamilyConfig): void {
    if (!config || typeof config !== 'object') {
      throw new Error(`Missing schema family config: ${family}`);
    }
    if (!semver.valid(config.current)) {
      throw new Error(`schemas.${family}.current must be a valid semver`);
    }

    this.validateVersionList(`schemas.${family}.supported`, config.supported);
    this.validateVersionList(`schemas.${family}.deprecated`, config.deprecated);
    this.validateVersionList(`schemas.${family}.eol`, config.eol);

    if (!config.supported.includes(config.current)) {
      throw new Error(`schemas.${family}.current must be in schemas.${family}.supported`);
    }
  }

  private loadRegistry(): SchemaVersionsRegistry {
    if (this.cachedRegistry) return this.cachedRegistry;

    const raw = fs.readFileSync(this.registryFilePath, 'utf-8');
    const parsed = JSON.parse(raw) as SchemaVersionsRegistry;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('schema-versions.json must be a JSON object');
    }
    if (!semver.valid(parsed.schemaRegistryVersion)) {
      throw new Error('schema-versions.json schemaRegistryVersion must be a valid semver');
    }
    if (!parsed.schemas || typeof parsed.schemas !== 'object') {
      throw new Error('schema-versions.json must contain schemas object');
    }

    for (const family of schemaFamilies) {
      this.validateFamilyConfig(family, parsed.schemas[family]);
    }

    this.cachedRegistry = parsed;
    return parsed;
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
