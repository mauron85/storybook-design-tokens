// cssModuleTracker.ts
import type { Plugin } from 'vite';
import postcss from 'postcss';
import { SerializableMap, SerializableSet } from './utils/Serializables.js';
import path from 'node:path';
import { CSS_TOKENS_MAP } from './constants.js';

// Regex for extracting var() references from values
const CSS_VAR_USAGE = /var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,[^)]+)?\)/g;

/**
 * Normalize a CSS value by collapsing whitespace (newlines, tabs, multiple spaces) to single spaces.
 */
const normalizeValue = (value: string): string => value.replaceAll(/\s+/g, ' ').trim();

export function cssModuleTracker(): Plugin {
  const tokensMap: Map<string, Map<string, Set<string>>> = new SerializableMap();
  let root = '';
  let isBuild = false;

  function parseCssTokens(code: string) {
    const rootNode = postcss.parse(code);
    const cssTokens: Map<string, Set<string>> = new SerializableMap();

    rootNode.walkDecls((decl) => {
      const prop = decl.prop;
      const tokenSet = new SerializableSet<string>();

      // declared tokens
      if (prop.startsWith('--')) {
        tokenSet.add(decl.value);
        // Tokens used via var()
      } else {
        for (const match of decl.value.matchAll(CSS_VAR_USAGE)) {
          tokenSet.add(match[1]);
        }
      }

      if (tokenSet.size > 0) {
        const fileSet = cssTokens.get(prop) ?? new SerializableSet();
        cssTokens.set(prop, new SerializableSet([...fileSet, ...tokenSet]));
      }
    });

    return cssTokens;
  }

  function serialize(): string {
    return JSON.stringify(tokensMap, null, 2);
  }

  return {
    name: 'css-module-tracker',

    configResolved(config) {
      root = config.root;
    },

    buildStart() {
      tokensMap.clear();
      isBuild = true;
    },

    transform(code, id) {
      if (!id.endsWith('.module.css')) return null;
      const tokens = parseCssTokens(code);
      tokensMap.set(id, tokens);
      return null;
    },

    configureServer(server) {
      // Dev mode: serve JSON dynamically
      isBuild = false;
      server.middlewares.use(`/${CSS_TOKENS_MAP}`, (_, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(serialize());
      });
    },

    generateBundle() {
      if (!isBuild) return;

      const componentTokens: Map<string, Map<string, Set<string>>> = new SerializableMap();

      for (const [cssId, cssTokens] of tokensMap.entries()) {
        const info = this.getModuleInfo(cssId);
        if (!info) continue;

        for (const importer of info.importers) {
          const compPath = typeof importer === 'string' ? importer : importer.id;
          if (!compPath) continue;
          // make path relative to root
          const relPath = path.relative(root, compPath);

          const compTokens = componentTokens.get(relPath);
          if (!compTokens) {
            componentTokens.set(relPath, cssTokens);
            continue;
          }

          for (const [cssProp, tokens] of cssTokens.entries()) {
            const compPropTokens = compTokens?.get(cssProp) ?? new SerializableSet();
            compTokens.set(cssProp, new SerializableSet([...compPropTokens, ...tokens]));
          }

          componentTokens.set(relPath, compTokens);
        }
      }

      this.emitFile({
        type: 'asset',
        fileName: CSS_TOKENS_MAP,
        source: JSON.stringify(componentTokens, null, 2),
      });
    },
  };
}
