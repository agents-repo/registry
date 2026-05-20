import matter from 'gray-matter';

export function parseFrontmatterData(content: string): Record<string, unknown> {
  try {
    const parsed = matter(content);
    if (typeof parsed.data === 'object' && parsed.data !== null && !Array.isArray(parsed.data)) {
      return parsed.data;
    }
  } catch {
    return {};
  }

  return {};
}

/**
 * Extracts scalar key-value pairs from YAML frontmatter using gray-matter.
 */
export function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  const data = parseFrontmatterData(content);
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = String(value);
    }
  }

  return result;
}
