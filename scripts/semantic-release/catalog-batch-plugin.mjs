import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tsxCli = path.join(repoRoot, 'node_modules/tsx/dist/cli.mjs');
const catalogReleaseCheckScript = path.join(repoRoot, 'scripts/catalog-release-check.ts');

/**
 * Catalog batch semantic-release plugin.
 * Forces a PATCH release when `packages/` has unreleased changes since the latest v* tag.
 */
export async function analyzeCommits(_pluginConfig, context) {
  try {
    execFileSync(process.execPath, [tsxCli, catalogReleaseCheckScript], {
      cwd: repoRoot,
      stdio: 'pipe',
      env: { ...process.env, ...context.env },
    });
    context.logger.log('Catalog batch plugin: unreleased package changes detected; releasing PATCH.');
    return 'patch';
  } catch (error) {
    const exitCode =
      error !== null && typeof error === 'object' && 'status' in error ? error.status : undefined;
    if (exitCode === 1) {
      context.logger.log('Catalog batch plugin: no unreleased package changes; skipping release.');
      return null;
    }

    const message = error instanceof Error ? error.message : String(error);
    context.logger.error(
      `Catalog batch plugin: catalog-release-check failed (exit ${exitCode ?? 'unknown'}): ${message}`,
    );
    throw error;
  }
}
