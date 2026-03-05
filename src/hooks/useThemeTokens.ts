import type { ParsedToken } from '../types.js';
import { parseThemeCss } from '../parsers.js';
import { useSuspense } from './useSuspense.js';

export interface UseThemeTokensOptions {
  themeCssPath?: string;
}

/**
 * Hook to fetch and parse theme tokens from a CSS file.
 *
 * @param options - Options for fetching theme tokens, including the path to the theme CSS file.
 * @returns An array of parsed theme tokens
 */
export function useThemeTokens({ themeCssPath }: UseThemeTokensOptions): ParsedToken[] {
  const fetchThemeTokens = async (themeCssPath?: string): Promise<ParsedToken[]> => {
    if (themeCssPath) {
      const response = await window.fetch(themeCssPath);
      if (response.ok) {
        const themeCssText = await response.text();
        const themeTokens = parseThemeCss(themeCssText);
        return themeTokens;
      }
    }
    return [];
  };

  return useSuspense(fetchThemeTokens, [themeCssPath]);
}
