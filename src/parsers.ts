import postcss from 'postcss';
import type { BaseToken, ParsedToken } from './types.js';

// Regex for extracting var() references from values
const CSS_VAR_USAGE = /var\(\s*--([a-zA-Z0-9-_]+)\s*(?:,[^)]+)?\)/g;

/**
 * Normalize a CSS value by collapsing whitespace (newlines, tabs, multiple spaces) to single spaces.
 */
const normalizeValue = (value: string): string => value.replaceAll(/\s+/g, ' ').trim();

const toCategory = (name: string): string => {
  const parts = name.split('-');

  // Handle common design token namespaces (cds, figma, etc.)
  // Category is typically the second segment: cds-color-*, figma-size-*, etc.
  if (parts.length >= 2) {
    const potentialNamespace = parts[0];
    const potentialCategory = parts[1];

    // If first part looks like a namespace, use second part as category
    if (potentialNamespace && potentialNamespace.length <= 6 && potentialCategory) {
      return potentialCategory;
    }
  }

  // Fallback to first segment
  return parts[0] || 'misc';
};

/**
 * Parse CSS content using PostCSS AST to extract CSS variable declarations.
 */
function parseCssDeclarations(content: string, source: 'theme' | 'component'): BaseToken[] {
  const tokenMap = new Map<string, BaseToken>();

  try {
    const root = postcss.parse(content);

    root.walkDecls((decl) => {
      // Check if this is a CSS custom property (starts with --)
      if (decl.prop.startsWith('--')) {
        const tokenName = decl.prop.slice(2); // Remove leading --
        const tokenValue = normalizeValue(decl.value);

        // Dedupe by name - later declarations override earlier ones
        tokenMap.set(tokenName, {
          name: tokenName,
          value: tokenValue,
          category: toCategory(tokenName),
          source,
        });
      }
    });
  } catch {
    // If PostCSS fails to parse, return empty array
    // This can happen with malformed CSS
    console.warn('Failed to parse CSS content');
  }

  return Array.from(tokenMap.values());
}

export function parseThemeCss(content: string): BaseToken[] {
  return parseCssDeclarations(content, 'theme');
}

/**
 * Parse component CSS to extract var() usages.
 */
export function parseComponentCssUsages(content: string): string[] {
  const used = new Set<string>();

  try {
    const root = postcss.parse(content);

    root.walkDecls((decl) => {
      // Find all var() usages in the declaration value
      for (const match of decl.value.matchAll(CSS_VAR_USAGE)) {
        used.add(match[1]);
      }
    });
  } catch {
    // Fallback to regex if PostCSS fails
    for (const match of content.matchAll(CSS_VAR_USAGE)) {
      used.add(match[1].trim());
    }
  }

  return [...used];
}

/**
 * Parse component CSS to extract local token definitions (semantic tokens defined within a component).
 * These are CSS variable declarations within selectors, not at :root level.
 */
export function parseComponentCssTokens(content: string): BaseToken[] {
  return parseCssDeclarations(content, 'component');
}

interface DictionaryNode {
  value?: unknown;
  attributes?: { category?: string };
  [key: string]: unknown;
}

export function parseStyleDictionaryTokens(dictionary: Record<string, unknown>): BaseToken[] {
  const output: BaseToken[] = [];

  const walk = (node: DictionaryNode, path: string[]) => {
    if (Object.hasOwn(node, 'value')) {
      const name = path.join('-');
      output.push({
        name,
        value: String(node.value),
        category: node.attributes?.category ?? path[0] ?? 'misc',
        source: 'style-dictionary',
      });
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === 'attributes' || key === 'value') {
        continue;
      }
      if (value && typeof value === 'object') {
        walk(value as DictionaryNode, [...path, key]);
      }
    }
  };

  walk(dictionary as DictionaryNode, []);
  return output;
}

/**
 * Parse component CSS to extract selector-to-token mappings using PostCSS AST.
 * Returns a map where keys are token names and values are arrays of CSS selectors that use that token.
 */
export function parseSelectorTokenMap(content: string): Map<string, string[]> {
  const selectorMap = new Map<string, string[]>();

  try {
    const root = postcss.parse(content);

    root.walkRules((rule) => {
      // Get the selector for this rule
      const selector = rule.selector.replaceAll(/\s+/g, ' ').trim();

      // Walk all declarations in this rule
      rule.walkDecls((decl) => {
        // Find all var() usages in the declaration value
        for (const match of decl.value.matchAll(CSS_VAR_USAGE)) {
          const tokenName = match[1];
          const existing = selectorMap.get(tokenName) ?? [];

          // Add selector if not already present
          if (!existing.includes(selector)) {
            existing.push(selector);
            selectorMap.set(tokenName, existing);
          }
        }
      });
    });
  } catch {
    // If PostCSS fails to parse, return empty map
    console.warn('Failed to parse CSS content for selector mapping');
  }

  return selectorMap;
}

export function enrichSemanticReferences(tokens: BaseToken[]): ParsedToken[] {
  const tokenMap = new Map(tokens.map((token) => [token.name, token]));

  const resolveChain = (
    tokenName: string,
    visited: Set<string> = new Set(),
  ): { chain: string[]; finalValue: string | undefined } => {
    if (visited.has(tokenName)) {
      // Circular reference, stop
      return { chain: [], finalValue: undefined };
    }
    visited.add(tokenName);

    const token = tokenMap.get(tokenName);
    if (!token) {
      return { chain: [], finalValue: undefined };
    }

    const refMatch = /var\(\s*--([a-zA-Z0-9-_]+)\s*\)/.exec(token.value);
    if (!refMatch) {
      // This is a final value, not a reference
      return { chain: [], finalValue: token.value };
    }

    const referencedName = refMatch[1];
    const deeper = resolveChain(referencedName, visited);

    return {
      chain: [referencedName, ...deeper.chain],
      finalValue: deeper.finalValue,
    };
  };

  return tokens.map((token) => {
    // Check if value contains a var() reference (allow whitespace inside parens)
    const refMatch = /var\(\s*--([a-zA-Z0-9-_]+)\s*\)/.exec(token.value);
    if (!refMatch) {
      // No reference, this is a primitive/direct value
      return token;
    }

    const { chain, finalValue } = resolveChain(token.name, new Set());

    // chain includes all intermediate references
    // The last element in chain (if any) is the primitive
    const intermediateChain = chain.slice(0, -1); // All except the last
    const primitiveName = chain.at(-1);

    // If finalValue is undefined, the chain couldn't be fully resolved
    // Use the original value as display
    const resolvedValue = finalValue ?? token.value;

    return {
      ...token,
      referenceChain: intermediateChain.length > 0 ? intermediateChain : undefined,
      primitiveName,
      primitiveValue: resolvedValue,
    };
  });
}
