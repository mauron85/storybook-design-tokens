import React, { useMemo, useState } from 'react';
import { EmptyTabContent, Form } from 'storybook/internal/components';
import type { ParsedToken } from '../types';

interface Props {
  allTokens: ParsedToken[];
  usedTokenNames: string[];
  showUnusedByDefault: boolean;
}

const groupByCategory = (tokens: ParsedToken[]): Record<string, ParsedToken[]> =>
  tokens.reduce<Record<string, ParsedToken[]>>((acc, token) => {
    const list = acc[token.category] ?? [];
    list.push(token);
    acc[token.category] = list;
    return acc;
  }, {});

export function DesignTokensPanel({ allTokens, usedTokenNames, showUnusedByDefault }: Props) {
  const [query, setQuery] = useState('');
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [showUnused, setShowUnused] = useState(showUnusedByDefault);

  const visibleTokens = useMemo(() => {
    const base = showAllTokens
      ? allTokens
      : showUnused
        ? allTokens
        : allTokens.filter((token) => usedTokenNames.includes(token.name));

    if (!query.trim()) return base;

    const needle = query.toLowerCase();
    return base.filter(
      (token) =>
        token.name.toLowerCase().includes(needle) ||
        token.category.toLowerCase().includes(needle) ||
        token.value.toLowerCase().includes(needle) ||
        token.primitiveName?.toLowerCase().includes(needle)
    );
  }, [allTokens, query, showAllTokens, showUnused, usedTokenNames]);

  if (!allTokens.length) {
    return <EmptyTabContent title="No tokens found" description="Configure designTokens.themeCssPath in preview.ts." />;
  }

  const grouped = groupByCategory(visibleTokens);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Form.Input
          size="100%"
          placeholder="Filter tokens..."
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <label>
          <input type="checkbox" checked={showAllTokens} onChange={() => setShowAllTokens((value) => !value)} /> Show all tokens page
        </label>
        <label>
          <input type="checkbox" checked={showUnused} onChange={() => setShowUnused((value) => !value)} /> Show unused tokens
        </label>
      </div>

      {Object.entries(grouped).map(([category, tokens]) => (
        <div key={category} style={{ marginBottom: 18 }}>
          <h4 style={{ margin: '8px 0' }}>{category}</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Semantic token</th>
                <th align="left">Primitive token</th>
                <th align="left">Value</th>
                <th align="left">Used</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => {
                const used = usedTokenNames.includes(token.name);
                return (
                  <tr key={`${category}-${token.name}`}>
                    <td>{token.name}</td>
                    <td>{token.primitiveName ?? '—'}</td>
                    <td>{token.primitiveValue ?? token.value}</td>
                    <td>{used ? 'yes' : 'no'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
