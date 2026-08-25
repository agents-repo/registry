import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectChangedPaths,
  matchPathGroups,
} from '../scripts/ci-pr-path-filters.mjs';

test('package-lock.json turns slides and zips on and agents off', () => {
  const matches = matchPathGroups(['package-lock.json']);
  assert.equal(matches.slides, true);
  assert.equal(matches.zips, true);
  assert.equal(matches.agents, false);
});

test('package.json turns slides and zips on and agents off', () => {
  const matches = matchPathGroups(['package.json']);
  assert.equal(matches.slides, true);
  assert.equal(matches.zips, true);
  assert.equal(matches.agents, false);
});

test('agents.json turns checksum on without zips or slides', () => {
  const matches = matchPathGroups(['agents.json']);
  assert.equal(matches.agents, true);
  assert.equal(matches.slides, false);
  assert.equal(matches.zips, false);
});

test('docs-only README turns no extras on', () => {
  const matches = matchPathGroups(['README.md']);
  assert.equal(matches.slides, false);
  assert.equal(matches.agents, false);
  assert.equal(matches.zips, false);
});

test('packages change turns zips on', () => {
  const matches = matchPathGroups(['packages/example/metadata.json']);
  assert.equal(matches.zips, true);
  assert.equal(matches.slides, false);
  assert.equal(matches.agents, false);
});

test('scripts/slides.mjs turns slides on and zips off', () => {
  const matches = matchPathGroups(['scripts/slides.mjs']);
  assert.equal(matches.slides, true);
  assert.equal(matches.zips, false);
});

test('specs change turns zips on', () => {
  const matches = matchPathGroups(['specs/package-format.md']);
  assert.equal(matches.zips, true);
});

test('pr-baseline.yml turns every extra this job defines on', () => {
  const matches = matchPathGroups(['.github/workflows/pr-baseline.yml']);
  assert.equal(matches.slides, true);
  assert.equal(matches.agents, true);
  assert.equal(matches.zips, true);
});

test('rename previous_filename is collected for matching', () => {
  const paths = collectChangedPaths([
    { filename: 'packages/new/metadata.json', previous_filename: 'specs/old.md' },
  ]);
  const matches = matchPathGroups(paths);
  assert.equal(matches.zips, true);
});
