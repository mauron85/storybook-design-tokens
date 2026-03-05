export const ADDON_ID = 'storybook/design-tokens-panel';
export const PANEL_ID = `${ADDON_ID}/panel`;
export const PANEL_TITLE = 'Design tokens';
export const KEY = `storybook/design-tokens-panel`;
export const CSS_TOKENS_MAP = 'css-tokens';
export const PARAMETER_KEY = 'designTokens';

export const EVENTS = {
  UPDATE: `${ADDON_ID}/update`,
  HIGHLIGHT: `${ADDON_ID}/highlight`,
  CLEAR_HIGHLIGHT: `${ADDON_ID}/clear-highlight`,
  ELEMENT_INFO: `${ADDON_ID}/element-info`,
} as const;
