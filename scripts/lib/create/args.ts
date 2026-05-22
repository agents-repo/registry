export interface ParsedArgs {
  help: boolean;
  packageId?: string;
  templateId?: string;
  name?: string;
  description?: string;
  owner?: string;
  tags?: string;
  homepage?: string;
  repository?: string;
  maintainers?: string;
  agents: string[];
  flows: string[];
}

export type FailFn = (message: string) => never;

export function parseCreateArgs(argv: string[], fail: FailFn): ParsedArgs {
  const args = argv.slice(2);
  const parsed: ParsedArgs = {
    help: false,
    agents: [],
    flows: [],
  };

  const valueHandlers: Partial<Record<string, (value: string) => void>> = {
    '--package': (value) => {
      parsed.packageId = value;
    },
    '--template': (value) => {
      parsed.templateId = value;
    },
    '--name': (value) => {
      parsed.name = value;
    },
    '--description': (value) => {
      parsed.description = value;
    },
    '--owner': (value) => {
      parsed.owner = value;
    },
    '--tags': (value) => {
      parsed.tags = value;
    },
    '--homepage': (value) => {
      parsed.homepage = value;
    },
    '--repository': (value) => {
      parsed.repository = value;
    },
    '--maintainers': (value) => {
      parsed.maintainers = value;
    },
    '--agent': (value) => {
      parsed.agents.push(value);
    },
    '--flow': (value) => {
      parsed.flows.push(value);
    },
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    const handler = valueHandlers[arg];
    if (handler !== undefined) {
      const next = args.at(i + 1);
      if (next === undefined || next.startsWith('--')) {
        fail(`${arg} requires a value`);
      }
      handler(next);
      i += 1;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  return parsed;
}

export function requireArgValue(flag: string, value: string | undefined, fail: FailFn): string {
  if (value === undefined || value.startsWith('--') || value.trim().length === 0) {
    fail(`${flag} requires a value`);
  }
  return value.trim();
}
