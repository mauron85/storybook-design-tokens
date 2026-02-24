import type { BaseToken, ParsedToken } from './types';

const CSS_VAR_DECLARATION = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;
const CSS_VAR_USAGE = /var\(--([a-zA-Z0-9-_]+)\)/g;

const toCategory = (name: string): string => {
  const [category] = name.split('-');
  return category || 'misc';
};

export function parseThemeCss(content: string): BaseToken[] {
  const tokens: BaseToken[] = [];
  for (const match of content.matchAll(CSS_VAR_DECLARATION)) {
    const tokenName = match[1].trim();
    const tokenValue = match[2].trim();
    tokens.push({
      name: tokenName,
      value: tokenValue,
      category: toCategory(tokenName),
      source: 'theme'
    });
  }
  return tokens;
}

export function parseComponentCssUsages(content: string): string[] {
  const used = new Set<string>();
  for (const match of content.matchAll(CSS_VAR_USAGE)) {
    used.add(match[1].trim());
  }
  return [...used];
}

interface DictionaryNode {
  value?: unknown;
  attributes?: { category?: string };
  [key: string]: unknown;
}

export function parseStyleDictionaryTokens(dictionary: Record<string, unknown>): BaseToken[] {
  const output: BaseToken[] = [];

  const walk = (node: DictionaryNode, path: string[]) => {
    if (Object.prototype.hasOwnProperty.call(node, 'value')) {
      const name = path.join('-');
      output.push({
        name,
        value: String(node.value),
        category: node.attributes?.category ?? path[0] ?? 'misc',
        source: 'style-dictionary'
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

export function enrichSemanticReferences(tokens: BaseToken[]): ParsedToken[] {
  const tokenMap = new Map(tokens.map((token) => [token.name, token]));
  return tokens.map((token) => {
    const refMatch = token.value.match(/var\(--([a-zA-Z0-9-_]+)\)/);
    if (!refMatch) {
      return token;
    }
    const primitiveName = refMatch[1];
    const primitive = tokenMap.get(primitiveName);
    return {
      ...token,
      primitiveName,
      primitiveValue: primitive?.value
    };
  });
}
