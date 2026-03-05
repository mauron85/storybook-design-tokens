import { useMemo } from 'react';
import type { ParsedToken } from '../types.js';
import { useThemeTokens, type UseThemeTokensOptions } from './useThemeTokens.js';
import { useModuleTokens, type UseModuleTokensOptions } from './useModuleTokens.js';

export type FilterMode = 'story' | 'component' | 'all';

export interface UseFilteredTokensOptions extends UseThemeTokensOptions, UseModuleTokensOptions {
  filterMode: FilterMode;
}

interface UseFilteredTokensResult {
  tokens: ParsedToken[];
  usedTokenNames: Set<string>;
}

/**
 * Filtering hook that fetches theme tokens and module tokens internally,
 * enriches theme tokens with class-name info from the module data,
 * and filters them according to the active `FilterMode`.
 *
 * Query-based text filtering is left to the consuming component.
 */
export function useFilteredTokens({
  filterMode,
  themeCssPath,
  storyPath,
}: UseFilteredTokensOptions): UseFilteredTokensResult {
  const themeTokens = useThemeTokens({ themeCssPath });
  const { usedTokenNames, tokenClassMap } = useModuleTokens({ storyPath });

  const tokens = useMemo(() => {
    // Filter out private tokens (starting with underscore)
    const publicTokens = themeTokens.filter((token) => !token.name.startsWith('_'));

    // Attach classNames from tokenClassMap
    const enriched = publicTokens.map((token) => {
      const classes = tokenClassMap.get(token.name);
      return classes && classes.size > 0 ? { ...token, classNames: Array.from(classes) } : token;
    });

    // Apply filter mode
    switch (filterMode) {
      case 'story':
        return enriched.filter((token) => usedTokenNames.has(token.name));
      case 'component':
        return enriched.filter((token) => token.source === 'component');
      case 'all':
      default:
        return enriched;
    }
  }, [themeTokens, filterMode, usedTokenNames, tokenClassMap]);

  return { tokens, usedTokenNames };
}
