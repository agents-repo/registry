import matter from 'gray-matter';

export function parseFrontmatterData(content: string): Record<string, unknown> {
  try {
    const parsed = matter(content);
    const data: unknown = parsed.data;
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      return data as Record<string, unknown>;
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
