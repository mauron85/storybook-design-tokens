import postcss from 'postcss';
import { SerializableMap, SerializableSet } from './serializables.js';
import type { PluginContext } from 'rollup';
import type { TokenModule } from './types';
import type { ViteDevServer } from 'vite';

const CSS_VAR = /var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,[^)]+)?\)/;
const CSS_VAR_GLOBAL = /var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,[^)]+)?\)/g;

export const cleanId = (id: string): string => id.split('?')[0].replace(/\\/g, '/');

export function parseCssToTokenModule(code: string, relativePath: string): TokenModule {
  const rootNode = postcss.parse(code);
  const tokenMap = new SerializableMap<string, any>();
  const rootVars = new SerializableMap<string, string>();
  tokenMap.set('root', rootVars);

  rootNode.walkDecls((decl) => {
    const { prop, value } = decl;
    const cleanValue = value.trim();

    if (prop.startsWith('--')) {
      const match = CSS_VAR.exec(cleanValue);
      rootVars.set(prop, match?.[1] ?? cleanValue);
    } else {
      for (const match of cleanValue.matchAll(CSS_VAR_GLOBAL)) {
        if (match[1]) {
          if (!tokenMap.has(prop)) tokenMap.set(prop, new SerializableSet<string>());
          tokenMap.get(prop).add(match[1]);
        }
      }
    }
  });

  if (rootVars.size === 0) {
    tokenMap.delete('root');
  }

  return {
    id: relativePath,
    tokens: tokenMap as unknown as TokenModule['tokens'],
  };
}

export function* crawlCssModules(
  ctx: PluginContext | ViteDevServer,
  startId: string,
  visited = new SerializableSet<string>(),
  chain: string[] = [],
  depth = 0,
  maxDepth = 6,
): Generator<{ componentId: string; cssId: string; chain: string[] }> {
  const id = cleanId(startId);
  if (!id || visited.has(id) || depth > maxDepth) return;
  visited.add(id);

  const currentChain = [...chain, id];

  try {
    let importedModules: readonly string[] = [];
    if ('getModuleInfo' in ctx) {
      const info = ctx.getModuleInfo(id);
      if (info?.importedIds) importedModules = info.importedIds;
    } else if (ctx.moduleGraph) {
      const mod = ctx.moduleGraph.getModuleById(id) || ctx.moduleGraph.getModuleByUrl(id);
      if (mod?.importedModules) importedModules = Array.from(mod.importedModules);
    }

    for (const m of importedModules) {
      const rawDepId = typeof m === 'string' ? m : m.id || m.url;
      if (!rawDepId) continue;
      const cleanDep = cleanId(rawDepId);

      if (cleanDep.includes('.module.css')) {
        yield { componentId: id, cssId: cleanDep, chain: [...currentChain, cleanDep] };
      } else if (!cleanDep.includes('node_modules') && /\.(js|jsx|ts|tsx|vue|svelte)$/.test(cleanDep)) {
        yield* crawlCssModules(ctx, cleanDep, visited, currentChain, depth + 1, maxDepth);
      }
    }
  } catch {
    return;
  }
}
