/**
 * build — Repository-wide build entry point.
 *
 * For package-specific releases, use:
 *   npm run package:build -- --package <id>
 */
console.error(
  'Repository-wide build is not implemented. ' +
    'To build a specific package use: npm run package:build -- --package <id>',
);
process.exitCode = 1;
