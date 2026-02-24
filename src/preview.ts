import { addons } from '@storybook/preview-api';
import type { Decorator, Preview } from '@storybook/preview-api';
import { EVENTS } from './constants';
import {
  enrichSemanticReferences,
  parseComponentCssUsages,
  parseStyleDictionaryTokens,
  parseThemeCss
} from './parsers';
import type { BaseToken, DesignTokensAddonOptions, StoryTokenPayload } from './types';

const safeFetchText = async (path?: string): Promise<string> => {
  if (!path) return '';
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.text();
};

const safeFetchJson = async (path?: string): Promise<Record<string, unknown> | null> => {
  if (!path) return null;
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
};

const inferComponentCssPath = (context: Parameters<Decorator>[1]): string | undefined => {
  const hinted = context.parameters.designTokens?.componentCssPath as string | undefined;
  if (hinted) return hinted;

  const fileName =
    (context.component as { __docgenInfo?: { fileName?: string } } | undefined)?.__docgenInfo?.fileName ??
    (context.parameters.fileName as string | undefined);
  if (!fileName) return undefined;

  return fileName.replace(/\.[^.]+$/, '.module.css');
};

const emitDesignTokens: Decorator = (Story, context) => {
  const channel = addons.getChannel();
  const options = (context.parameters.designTokens ?? {}) as DesignTokensAddonOptions;

  void (async () => {
    const themeCssText = await safeFetchText(options.themeCssPath);
    const componentCssPath = inferComponentCssPath(context);
    const componentCssText = await safeFetchText(componentCssPath);

    const themeTokens = parseThemeCss(themeCssText);
    const usedTokenNames = parseComponentCssUsages(componentCssText);

    let dictionaryTokens: BaseToken[] = [];
    const dictionaryJson = await safeFetchJson(options.styleDictionaryPath);
    if (dictionaryJson) dictionaryTokens = parseStyleDictionaryTokens(dictionaryJson);

    const allTokens = enrichSemanticReferences([...themeTokens, ...dictionaryTokens]);
    const usedTokens = allTokens.filter((token) => usedTokenNames.includes(token.name));

    const payload: StoryTokenPayload = {
      storyId: context.id,
      tokens: usedTokens,
      allTokens,
      usedTokenNames,
      componentCssPath
    };
    channel.emit(EVENTS.UPDATE, payload);
  })().catch(() => {
    channel.emit(EVENTS.UPDATE, {
      storyId: context.id,
      tokens: [],
      allTokens: [],
      usedTokenNames: [],
      componentCssPath: inferComponentCssPath(context)
    } satisfies StoryTokenPayload);
  });

  return Story();
};

const preview: Preview = {
  decorators: [emitDesignTokens]
};

export default preview;
