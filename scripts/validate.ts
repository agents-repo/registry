/**
 * validate — Repository-wide validation entry point.
 *
 * For package-specific validation, use:
 *   npm run package:validate -- --package <id>
 */
console.error(
  'Repository-wide validation is not implemented. ' +
    'To validate a specific package use: npm run package:validate -- --package <id>',
);
process.exitCode = 1;
