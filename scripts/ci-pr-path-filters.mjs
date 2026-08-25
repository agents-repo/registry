#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const NPM_LOCKFILES = ['package.json', 'package-lock.json'];
const PR_BASELINE_WORKFLOW = '.github/workflows/pr-baseline.yml';

/**
 * Repo-specific extra groups for PR baseline.
 * npm lockfiles MUST NOT be copied into `agents` (checksum exception).
 */
export const PATH_GROUPS = {
  slides: {
    include: [
      'docs/slides/**',
      'scripts/slides.mjs',
      ...NPM_LOCKFILES,
      PR_BASELINE_WORKFLOW,
    ],
    exclude: [],
  },
  agents: {
    include: [
      'agents.json',
      'agents-lock.json',
      '.github/agents/**',
      '.cursor/skills/**',
      '.claude/agents/**',
      '.agents/skills/**',
      PR_BASELINE_WORKFLOW,
    ],
    exclude: [],
  },
  zips: {
    include: [
      'packages/**',
      'scripts/**',
      'specs/**',
      ...NPM_LOCKFILES,
      PR_BASELINE_WORKFLOW,
    ],
    exclude: ['scripts/slides.mjs'],
  },
};

function normalizePath(value) {
  return String(value).replaceAll('\\', '/');
}

export function pathMatches(pattern, filePath) {
  const file = normalizePath(filePath);
  const pat = normalizePath(pattern);
  if (pat.endsWith('/**')) {
    const prefix = pat.slice(0, -2);
    return file.startsWith(prefix) || file === prefix.slice(0, -1);
  }
  const star = pat.indexOf('*');
  if (star === -1) {
    return file === pat;
  }
  if (pat.includes('*', star + 1)) {
    throw new Error(`unsupported glob (multiple wildcards): ${pattern}`);
  }
  const before = pat.slice(0, star);
  const after = pat.slice(star + 1);
  if (!file.startsWith(before) || !file.endsWith(after)) {
    return false;
  }
  const middle = file.slice(before.length, file.length - after.length);
  return !middle.includes('/');
}

function pathInGroup(filePath, group) {
  if ((group.exclude ?? []).some((pattern) => pathMatches(pattern, filePath))) {
    return false;
  }
  return (group.include ?? []).some((pattern) => pathMatches(pattern, filePath));
}

export function matchPathGroups(filePaths, groups = PATH_GROUPS) {
  const matches = {};
  for (const [name, group] of Object.entries(groups)) {
    matches[name] = filePaths.some((filePath) => pathInGroup(filePath, group));
  }
  return matches;
}

export function collectChangedPaths(apiFiles) {
  const paths = [];
  for (const file of apiFiles) {
    if (typeof file?.filename === 'string' && file.filename) {
      paths.push(file.filename);
    }
    if (typeof file?.previous_filename === 'string' && file.previous_filename) {
      paths.push(file.previous_filename);
    }
  }
  return paths;
}

function allExtrasTrue(groups) {
  return Object.fromEntries(Object.keys(groups).map((name) => [name, true]));
}

function formatMatchLines(matches) {
  return Object.entries(matches)
    .map(([name, enabled]) => `${name}=${enabled ? 'true' : 'false'}`)
    .join('\n');
}

function writeGithubOutput(matches) {
  const lines = `${formatMatchLines(matches)}\n`;
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- GITHUB_OUTPUT is the Actions runner path
    fs.appendFileSync(outputFile, lines);
  }
  process.stdout.write(lines);
}

function logMatchDetails(filePaths, matches, groups) {
  console.error(`Changed paths (${filePaths.length}):`);
  for (const filePath of filePaths) {
    console.error(`  ${filePath}`);
  }
  for (const [name, enabled] of Object.entries(matches)) {
    const group = groups[name];
    const include = (group.include ?? []).join(', ');
    if (enabled) {
      const hit = filePaths.filter((filePath) => pathInGroup(filePath, group));
      console.error(`${name}: run (matched ${hit.join(', ')})`);
    } else {
      console.error(`${name}: skip (no path in ${include})`);
    }
  }
}

async function listPullRequestFiles({ token, repository, pullNumber }) {
  if (!token) {
    throw new Error('missing GITHUB_TOKEN');
  }
  if (!repository?.includes('/')) {
    throw new Error('missing GITHUB_REPOSITORY');
  }
  if (!pullNumber) {
    throw new Error('missing PR_NUMBER');
  }
  const paths = [];
  let page = 1;
  for (;;) {
    const url =
      `https://api.github.com/repos/${repository}/pulls/${pullNumber}/files` +
      `?per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'agents-repo-ci-pr-path-filters',
      },
    });
    if (!response.ok) {
      throw new Error(`Pulls Files API ${response.status} ${response.statusText}`);
    }
    const batch = await response.json();
    if (!Array.isArray(batch)) {
      throw new TypeError('Pulls Files API returned a non-array payload');
    }
    paths.push(...collectChangedPaths(batch));
    if (batch.length < 100) {
      break;
    }
    page += 1;
    if (page > 100) {
      throw new Error('Pulls Files API pagination exceeded 100 pages');
    }
  }
  return paths;
}

export async function main(env = process.env) {
  const groups = PATH_GROUPS;
  try {
    const files = await listPullRequestFiles({
      token: env.GITHUB_TOKEN,
      repository: env.GITHUB_REPOSITORY,
      pullNumber: env.PR_NUMBER,
    });
    const matches = matchPathGroups(files, groups);
    logMatchDetails(files, matches, groups);
    writeGithubOutput(matches);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(
      `Failed to load PR file list (${reason}); running all extras (fail closed).`,
    );
    writeGithubOutput(allExtrasTrue(groups));
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  await main();
}
