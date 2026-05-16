import fs from 'node:fs';

export function readJsonFile(filePath: string): { data: unknown; error?: string } {
  let raw: string;

  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return { data: null, error: `Cannot read file: ${filePath}` };
  }

  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { data: null, error: `Invalid JSON in file: ${filePath}` };
  }
}
