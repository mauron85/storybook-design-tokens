import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export async function resolve(specifier, context, defaultResolve) {
  // Fast-path built-ins and node: prefix
  if (specifier.startsWith('node:') || ['fs', 'path', 'url', 'process', 'module', 'util'].includes(specifier)) {
    return defaultResolve(specifier, context, defaultResolve);
  }

  // 1. Try Node's default resolution (respects pnpm, workspaces, etc.)
  let resolution = await defaultResolve(specifier, context, defaultResolve);

  if (resolution?.url?.startsWith('file://')) {
    const fsPath = fileURLToPath(resolution.url);
    if (fs.existsSync(fsPath)) {
      return resolution; // Keep original URL (symlinks intact)
    }
  }

  // 2. Fallback to CWD-based locations (your ramdisk/symlink need)
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'node_modules', specifier),     // node_modules/<package>
    path.join(cwd, specifier)                      // direct from cwd (e.g. local file)
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;

    let targetPath = candidate;

    // If it's a directory → resolve to actual file entry point
    if (fs.statSync(candidate).isDirectory()) {
      const pkgJsonPath = path.join(candidate, 'package.json');

      if (fs.existsSync(pkgJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
          let entry = 'index.js';

          // Respect common fields in order of preference
          if (pkg.exports && pkg.exports['.']) {
            entry = typeof pkg.exports['.'] === 'string'
              ? pkg.exports['.']
              : pkg.exports['.'].default || pkg.exports['.'].module || pkg.exports['.'].import || 'index.js';
          } else if (pkg.module) {
            entry = pkg.module;
          } else if (pkg.main) {
            entry = pkg.main;
          }

          targetPath = path.resolve(candidate, entry);
          if (!fs.existsSync(targetPath)) {
            console.warn(`[custom-loader] Entry point "${entry}" not found in ${candidate}`);
            continue;
          }
        } catch (err) {
          console.warn(`[custom-loader] Failed parsing package.json in ${candidate}: ${err.message}`);
          continue;
        }
      } else {
        // No package.json → naive fallback to index.js
        targetPath = path.join(candidate, 'index.js');
        if (!fs.existsSync(targetPath)) continue;
      }
    }

    // Return resolved file URL
    return { url: pathToFileURL(targetPath).href };
  }

  // Give up → Node will throw meaningful error
  return resolution;
}

export async function load(url, context, defaultLoad) {
  if (!url.startsWith('file://')) {
    return defaultLoad(url, context, defaultLoad);
  }

  const filePath = fileURLToPath(url);

  try {
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      // Directory URL should not reach load if resolve is correct,
      // but guard anyway → let Node probe index or error naturally
      console.warn(`[custom-loader] Avoiding load on directory: ${url}`);
      return defaultLoad(url, context, defaultLoad);
    }

    // Safe file → proceed
    return defaultLoad(url, context, defaultLoad);

  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'EISDIR') {
      return defaultLoad(url, context, defaultLoad);
    }
    console.error(`[custom-loader load] Unexpected error for ${url}: ${err.message}`);
    throw err;
  }
}