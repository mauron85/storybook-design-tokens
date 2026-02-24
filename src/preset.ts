import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const managerEntries = (entry: string[] = []): string[] => [...entry, require.resolve('./manager')];

export const previewAnnotations = (entry: string[] = []): string[] => [...entry, require.resolve('./preview')];
