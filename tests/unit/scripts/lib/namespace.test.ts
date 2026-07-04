import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PackageError } from '../../../../scripts/lib/errors';
import {
  buildAliasesFromPackages,
  buildQualifiedId,
  listDiscoveredPackages,
  parseQualifiedPackageRef,
  resolvePackageDir,
  validateNamespaceEqualsOwner,
} from '../../../../scripts/lib/namespace';
import { OWNERS_FILENAME } from '../../../../scripts/lib/constants';

const createdDirs: string[] = [];

function makeTempPackagesDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-namespace-test-'));
  createdDirs.push(dir);
  return dir;
}

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('namespace', (): void => {
  it('parses qualified package refs', (): void => {
    expect(parseQualifiedPackageRef('agents-repo/hello-agent')).toEqual({
      namespace: 'agents-repo',
      packageId: 'hello-agent',
      qualifiedId: 'agents-repo/hello-agent',
    });
  });

  it('rejects flat package ids', (): void => {
    expect(() => parseQualifiedPackageRef('hello-agent')).toThrow(PackageError);
  });

  it('validates namespace equals owner', (): void => {
    expect(() => validateNamespaceEqualsOwner('agents-repo', 'agents-repo', 'agents-repo/hello-agent')).not.toThrow();
    expect(() => validateNamespaceEqualsOwner('other', 'agents-repo', 'other/hello-agent')).toThrow(PackageError);
  });

  it('discovers namespaced packages', (): void => {
    const packagesDir = makeTempPackagesDir();
    const packageDir = path.join(packagesDir, 'agents-repo', 'hello-agent');
    fs.mkdirSync(path.join(packageDir, 'versions'), { recursive: true });
    fs.writeFileSync(path.join(packageDir, 'metadata.json'), JSON.stringify({ owner: 'agents-repo' }));
    fs.writeFileSync(path.join(packageDir, 'versions', 'manifest.json'), JSON.stringify({ latest: '1.0.0', versions: [] }));

    const discovered = listDiscoveredPackages(packagesDir);
    expect(discovered).toHaveLength(1);
    expect(discovered[0]?.ref.qualifiedId).toBe(buildQualifiedId('agents-repo', 'hello-agent'));
  });

  it('rejects owners.json in namespace directory', (): void => {
    const packagesDir = makeTempPackagesDir();
    const namespaceDir = path.join(packagesDir, 'agents-repo');
    fs.mkdirSync(namespaceDir, { recursive: true });
    fs.writeFileSync(path.join(namespaceDir, OWNERS_FILENAME), '{"owners":[]}');

    expect(() => listDiscoveredPackages(packagesDir)).toThrow(PackageError);
  });

  it('resolves package directory from qualified ref', (): void => {
    const packagesDir = makeTempPackagesDir();
    const packageDir = path.join(packagesDir, 'agents-repo', 'hello-agent');
    fs.mkdirSync(packageDir, { recursive: true });

    const resolved = resolvePackageDir('agents-repo/hello-agent', packagesDir);
    expect(resolved.packageDir).toBe(packageDir);
  });

  it('builds aliases for uniquely named leaf package ids', (): void => {
    const aliases = buildAliasesFromPackages([
      { ref: { namespace: 'agents-repo', packageId: 'alpha-package', qualifiedId: 'agents-repo/alpha-package' } },
      { ref: { namespace: 'agents-repo', packageId: 'beta-package', qualifiedId: 'agents-repo/beta-package' } },
    ]);

    expect(aliases).toEqual({
      'alpha-package': 'agents-repo/alpha-package',
      'beta-package': 'agents-repo/beta-package',
    });
  });

  it('omits ambiguous leaf package ids shared across namespaces', (): void => {
    const aliases = buildAliasesFromPackages([
      { ref: { namespace: 'ns-a', packageId: 'hello-agent', qualifiedId: 'ns-a/hello-agent' } },
      { ref: { namespace: 'ns-b', packageId: 'hello-agent', qualifiedId: 'ns-b/hello-agent' } },
      { ref: { namespace: 'ns-a', packageId: 'unique-tool', qualifiedId: 'ns-a/unique-tool' } },
    ]);

    expect(aliases).toEqual({
      'unique-tool': 'ns-a/unique-tool',
    });
    expect(aliases).not.toHaveProperty('hello-agent');
  });
});
