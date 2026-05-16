export function parseRequiredPackageId(argv: string[]): string {
  const args = argv.slice(2);
  const idx = args.indexOf('--package');
  if (idx === -1 || !args[idx + 1]) {
    console.error('Error: --package <id> is required');
    process.exit(1);
  }
  return args[idx + 1];
}

export function parseOptionalFlagValue(argv: string[], flag: string): string | undefined {
  const args = argv.slice(2);
  const idx = args.indexOf(flag);
  if (idx === -1) {
    return undefined;
  }
  return args[idx + 1];
}

export function hasFlag(argv: string[], flag: string): boolean {
  return argv.slice(2).includes(flag);
}
