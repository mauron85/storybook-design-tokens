export interface BaseToken {
  name: string;
  value: string;
  category: string;
  source: 'theme' | 'style-dictionary';
}

export interface ParsedToken extends BaseToken {
  primitiveName?: string;
  primitiveValue?: string;
}

export interface StoryTokenPayload {
  storyId: string;
  tokens: ParsedToken[];
  allTokens: ParsedToken[];
  usedTokenNames: string[];
  componentCssPath?: string;
}

export interface DesignTokensAddonOptions {
  /** Public URL path to semantic theme.css file, e.g. /src/styles/theme.css */
  themeCssPath: string;
  /** Optional public URL to style-dictionary generated JSON tokens */
  styleDictionaryPath?: string;
  /** Optional path to component module stylesheet; if absent, addon tries to infer from component file */
  componentCssPath?: string;
  /** Show tokens not used by component by default */
  showUnusedByDefault?: boolean;
}
