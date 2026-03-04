import type { Plugin, ViteDevServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { SerializableMap } from './serializables.js';
import { cleanId, parseCssToTokenModule, crawlCssModules } from './core.js';
import { CSS_TOKENS_MAP } from '../constants.js';
import type { PluginContext } from 'rollup';
import type { TokenModule, StoryManifest } from './types';

export function cssModuleTracker(): Plugin {
  const tokenModules = new SerializableMap<string, TokenModule>();
  let rootPath = '';

  const getManifestData = (ctx: PluginContext | ViteDevServer, startId: string): StoryManifest => {
    const componentMap = new SerializableMap<string, StoryManifest['components'][number]>();
    const relStartId = path.relative(rootPath, cleanId(startId));

    try {
      for (const match of crawlCssModules(ctx, startId)) {
        const relComp = path.relative(rootPath, match.componentId);
        const relCss = path.relative(rootPath, match.cssId);

        if (!componentMap.has(relComp)) {
          componentMap.set(relComp, { id: relComp, modules: [] });
        }
        componentMap.get(relComp)!.modules.push({
          id: relCss,
          pathChain: match.chain.map((p) => path.relative(rootPath, p)),
        });
      }
    } catch (e) {
      return { id: relStartId, components: [], error: 'Crawl failed' };
    }

    return {
      id: relStartId,
      components: Array.from(componentMap.values()),
    };
  };

  return {
    name: 'css-module-tracker',
    configResolved(config) {
      rootPath = cleanId(config.root);
    },

    transform(code, id) {
      if (!id.includes('.module.css')) return null;
      const normalizedId = cleanId(id);
      tokenModules.set(normalizedId, parseCssToTokenModule(code, path.relative(rootPath, normalizedId)));
      return null;
    },

    async generateBundle() {
      for (const id of this.getModuleIds()) {
        if (!id.includes('.stories.')) continue;
        const manifest = getManifestData(this, id);
        if (manifest.components.length > 0) {
          this.emitFile({
            type: 'asset',
            fileName: `assets/${CSS_TOKENS_MAP}/${manifest.id}.json`,
            source: JSON.stringify(manifest, null, 2),
          });
        }
      }

      for (const [, data] of tokenModules) {
        this.emitFile({
          type: 'asset',
          fileName: `assets/${CSS_TOKENS_MAP}/${data.id}.json`,
          source: JSON.stringify(data, null, 2),
        });
      }
    },

    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const prefix = `/${CSS_TOKENS_MAP}/`;
        if (!req.url?.startsWith(prefix)) return next();

        try {
          const rawPath = decodeURIComponent(req.url.slice(prefix.length));
          const searchPath = rawPath.endsWith('.json') ? rawPath.replace(/\.json$/, '') : rawPath;
          const fullPath = cleanId(path.resolve(rootPath, searchPath));

          // 1. Check if the file actually exists on disk
          // This prevents the tracker from trying to crawl imaginary paths
          if (!fs.existsSync(fullPath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                error: 'file_not_found',
                message: `The source file does not exist: ${searchPath}`,
              }),
            );
          }

          // 2. Try TokenModule cache (already transformed .module.css)
          const cachedModule = tokenModules.get(fullPath);
          if (cachedModule) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(cachedModule));
          }

          // 3. Try Manifest generation (crawling the graph)
          const manifest = getManifestData(server, fullPath);

          // If we found the file but no CSS modules are linked yet
          if (manifest.components.length === 0) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                error: 'not_generated',
                message:
                  'File exists but no CSS modules detected. Open the story in your browser to populate the module graph.',
              }),
            );
          }

          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(manifest));
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: 'internal_error', message: String(err) }));
        }
      });
    },
  };
}
