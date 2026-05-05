/**
 * Extracts scalar key-value pairs from YAML frontmatter.
 * Only handles simple string and number scalar values sufficient for
 * .agent.md files.
 */
export function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!match) return {};

  const result: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.+)$/);
    if (m) {
      const raw = m[2].trim();
      // Strip optional surrounding single or double quotes
      result[m[1]] = raw.replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return result;
}
