/**
 * Token definitions and usages.
 * Accepts both a plain Record (post-serialization)
 * and a Map
 */
export type TokenData = Record<string, string | string[]> | Map<string, string | string[]>;

/**
 * The TokenModule: Created per .module.css file.
 * Represents a standalone data representation of a CSS module's tokens.
 */
export interface TokenModule {
  /** The relative path to the source CSS module (e.g., "src/Button.module.css") */
  id: string;
  /** The extracted token data */
  tokens: {
    /** Variables defined in :root or top-level scope */
    root: Record<string, string>;
    /** Property-to-Variable mappings (e.g., "color": ["--primary"]) */
    [cssProperty: string]: string[] | Record<string, string>;
  };
}

/**
 * The Story Manifest: Created per Story file.
 * Acts as the entry point for a specific Story's design token dependencies.
 */
export interface StoryManifest {
  /** The relative path to the Story file */
  id: string;
  /** List of components identified in this story's dependency tree */
  components: Array<{
    /** The Component file path (e.g., "src/stories/Button.tsx") */
    id: string;
    /** All CSS modules imported by this specific component */
    modules: Array<{
      /** The CSS module path (e.g., "src/stories/Button.module.css") */
      id: string;
      /** The dependency trace [Story -> ... -> Component -> CSS] */
      pathChain: string[];
    }>;
  }>;
}
