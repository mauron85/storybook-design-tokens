export interface BaseToken {
  name: string;
  value: string;
  category: string;
  source: 'theme' | 'style-dictionary' | 'component';
}

export interface ParsedToken extends BaseToken {
  /** Chain of intermediate token references (excluding the final primitive) */
  referenceChain?: string[];
  /** The final primitive token name */
  primitiveName?: string;
  /** The final resolved value */
  primitiveValue?: string;
}

export type CssDesignTokenMap = Record<string, Record<string, string[]>>;

export interface StoryTokenPayload {
  storyId: string;
  allTokens: ParsedToken[];
  tokenMap: CssDesignTokenMap;
}

export interface DesignTokensAddonOptions {
  /** Public URL path to semantic theme.css file, e.g. /src/styles/theme.css */
  themeCssPath: string;
  /** Optional public URL to style-dictionary generated JSON tokens */
  styleDictionaryPath?: string;
  /** Show tokens not used by component by default */
  showUnusedByDefault?: boolean;
}
