import { useSuspense } from './useSuspense.js';
import { CSS_TOKENS_MAP } from '../constants.js';
import type { TokenModule, StoryManifest } from '../cssModuleTracker/types.js';

export interface UseModuleTokensOptions {
  storyPath?: string;
}

/** Flat, consumer-friendly representation of all CSS-module token usage for a story. */
export interface FlatModuleTokens {
  /** Token names (without leading `--`) used in the story's CSS modules. */
  usedTokenNames: Set<string>;
  /** Map of token name → set of CSS selectors where the token appears. */
  tokenClassMap: Map<string, Set<string>>;
}

const EMPTY: FlatModuleTokens = { usedTokenNames: new Set(), tokenClassMap: new Map() };

/** Extract module IDs from a resolved manifest. */
function getModuleIds(manifest: StoryManifest | null): string[] {
  return manifest?.components?.flatMap((c) => c.modules.map((m) => m.id)) ?? [];
}

/** Fetch the story manifest for a given story path. */
async function fetchManifest(storyPath: string): Promise<StoryManifest | null> {
  try {
    const response = await window.fetch(`/${CSS_TOKENS_MAP}/${storyPath}`);
    if (response.ok) {
      return (await response.json()) as StoryManifest;
    }
  } catch (err) {
    console.error('Failed to fetch story manifest:', err);
  }
  return null;
}

/** Flatten an array of TokenModules into a single FlatModuleTokens structure. */
function flattenModules(modules: TokenModule[]): FlatModuleTokens {
  const usedTokenNames = new Set<string>();
  const tokenClassMap = new Map<string, Set<string>>();

  const track = (varName: string, selector?: string) => {
    const tokenName = varName.startsWith('--') ? varName.slice(2) : varName;
    usedTokenNames.add(tokenName);
    if (selector) {
      if (!tokenClassMap.has(tokenName)) tokenClassMap.set(tokenName, new Set());
      tokenClassMap.get(tokenName)!.add(selector);
    }
  };

  for (const module of modules) {
    const moduleTokens = module.tokens;

    for (const key in moduleTokens) {
      if (key === 'root') {
        const rootGroup = moduleTokens[key];
        for (const varName in rootGroup) {
          if (!varName.startsWith('--')) continue;
          const entry = rootGroup[varName];
          if (entry) track(varName, entry.selector);
        }
      } else {
        const propGroup = moduleTokens[key];
        for (const propName in propGroup) {
          const entry = propGroup[propName];
          if (entry?.token.startsWith('--')) {
            track(entry.token, entry.selector);
          }
        }
      }
    }
  }

  return { usedTokenNames, tokenClassMap };
}

/**
 * Hook to fetch, parse, and flatten component-level CSS module tokens for a story.
 *
 * Performs everything in a single `useSuspense` call keyed on `storyPath`:
 *  1. Fetches the story manifest (with retry for module-graph race conditions).
 *  2. Fetches the individual token modules listed in the manifest.
 *  3. Flattens the raw TokenModule array into usedTokenNames + tokenClassMap.
 *
 * @param options - Options including the story import path.
 * @returns Flat structure with usedTokenNames and tokenClassMap.
 */
export function useModuleTokens({ storyPath }: UseModuleTokensOptions): FlatModuleTokens {
  const fetchAndFlatten = async (storyPath?: string): Promise<FlatModuleTokens> => {
    if (!storyPath) return EMPTY;

    // Step 1 — fetch the manifest (retries if module graph isn't ready)
    const manifest = await fetchManifest(storyPath);
    const moduleIds = getModuleIds(manifest);
    if (moduleIds.length === 0) return EMPTY;

    // Step 2 — fetch individual token modules
    const modules = await Promise.all(
      moduleIds.map(async (id) => {
        const response = await window.fetch(`/${CSS_TOKENS_MAP}/${id}.json`);
        if (response.ok) {
          return (await response.json()) as TokenModule;
        }
        throw new Error(`Failed to fetch token module ${id}`);
      }),
    );

    return flattenModules(modules);
  };

  return useSuspense(fetchAndFlatten, [storyPath]);
}
