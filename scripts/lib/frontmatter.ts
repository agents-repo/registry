import matter from 'gray-matter';

/**
 * Extracts scalar key-value pairs from YAML frontmatter using gray-matter.
 */
export function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  try {
    const parsed = matter(content);
    for (const [key, value] of Object.entries(parsed.data)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        result[key] = String(value);
      }
    }
  } catch {
    return {};
  }

  return result;
}
