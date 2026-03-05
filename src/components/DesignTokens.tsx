import React, { useState, useMemo, type ChangeEvent, type FC } from 'react';
import { useFilteredTokens, type FilterMode, type UseFilteredTokensOptions } from '../hooks/useFilteredTokens';
import { DesignTokensTable, type ElementInfo } from './DesignTokensTable';
import { FilterToolbar } from './FilterToolbar';
import type { ParsedToken } from '../types';

type Props = Omit<UseFilteredTokensOptions, 'filterMode'> & {
  elementInfoMap: Map<string, ElementInfo>;
  onHighlight?: (token: ParsedToken) => void;
  onClearHighlight?: () => void;
};

export const DesignTokens: FC<Props> = (props) => {
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('story');

  const { tokens: modeFilteredTokens, usedTokenNames } = useFilteredTokens({
    filterMode,
    themeCssPath: props.themeCssPath,
    storyPath: props.storyPath,
  });

  const tokens = useMemo(() => {
    if (!query.trim()) return modeFilteredTokens;
    const needle = query.toLowerCase();
    return modeFilteredTokens.filter(
      (token) =>
        token.name.toLowerCase().includes(needle) ||
        token.category.toLowerCase().includes(needle) ||
        token.value.toLowerCase().includes(needle) ||
        token.primitiveName?.toLowerCase().includes(needle) ||
        token.classNames?.some((cls) => cls.toLowerCase().includes(needle)),
    );
  }, [modeFilteredTokens, query]);

  const usedCount = useMemo(() => tokens.filter((t) => usedTokenNames.has(t.name)).length, [tokens, usedTokenNames]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value);
  const handleFilterChange = (mode: FilterMode) => setFilterMode(mode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <FilterToolbar
        query={query}
        onSearchChange={handleSearchChange}
        filterMode={filterMode}
        onFilterChange={handleFilterChange}
        tokenCount={tokens.length}
        usedCount={usedCount}
      />
      <DesignTokensTable
        tokens={tokens}
        usedTokenNames={usedTokenNames}
        elementInfoMap={props.elementInfoMap}
        onHighlight={props.onHighlight}
        onClearHighlight={props.onClearHighlight}
      />
    </div>
  );
};
