import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Catalog batch semantic-release plugin.
 * Forces a PATCH release when `packages/` has unreleased changes since the latest v* tag.
 */
export async function analyzeCommits(_pluginConfig, context) {
  try {
    execFileSync('npm', ['run', 'catalog:release:check'], {
      cwd: repoRoot,
      stdio: 'pipe',
      env: { ...process.env, ...context.env },
    });
    context.logger.log('Catalog batch plugin: unreleased package changes detected; releasing PATCH.');
    return 'patch';
  } catch {
    context.logger.log('Catalog batch plugin: no unreleased package changes; skipping release.');
    return null;
  }
}
