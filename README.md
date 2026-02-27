# storybook-design-tokens-panel

Storybook **v10 addon** that adds a **Design tokens** panel for each component.

## Features

- Adds a `Design tokens` panel in Storybook manager.
- Reads semantic tokens from `theme.css`.
- Supports style-dictionary JSON token files.
- Parses a component's `Component.module.css` and shows only tokens used by that component.
- Filtering by token name/category/value/reference.
- Groups tokens by category.
- Renders semantic → primitive → value columns when semantic token references a primitive token.
- Includes toggle to display all tokens from `theme.css` (acts as "all tokens" page inside panel).
- Includes option to show unused tokens.

## Install

```bash
npm i -D storybook-design-tokens-panel
```

## Configure Storybook

`.storybook/main.ts`

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  addons: ['storybook-design-tokens-panel/preset']
};

export default config;
```

**For npm link development**, add Vite dedupe configuration:

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  addons: ['storybook-design-tokens-panel/preset'],
  async viteFinal(conf) {
    const { mergeConfig } = await import('vite');
    return mergeConfig(conf, {
      resolve: {
        dedupe: ['storybook-design-tokens-panel']
      }
    });
  }
};

export default config;
```

`.storybook/preview.ts`

```ts
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    designTokens: {
      themeCssPath: '/src/styles/theme.css',
      styleDictionaryPath: '/src/tokens/tokens.json',
      showUnusedByDefault: false
    }
  }
};

export default preview;
```

Per-story override:

```ts
export default {
  component: Button,
  parameters: {
    designTokens: {
      componentCssPath: '/src/components/Button/Button.module.css'
    }
  }
};
```

## Development

### Local Development with npm link

**Initial Setup:**

```bash
# In the addon directory
cd storybook-design-tokens
npm run build
npm link

# In your project directory
cd your-project
npm link storybook-design-tokens-panel
```

**Development Workflow (Recommended):**

1. **Start watch mode in the addon** (in separate terminal):
   ```bash
   cd storybook-design-tokens
   npm run dev
   ```
   This will automatically rebuild when you change TypeScript files.

2. **Start Storybook** (in another terminal):
   ```bash
   cd your-project
   npm run storybook
   ```

3. **Make changes** to addon source files in `src/`
   - TypeScript will automatically compile to `dist/`
   - **Refresh your browser** to see changes (Ctrl+R / Cmd+R)
   - No need to restart Storybook for most changes

**Manual rebuild (if needed):**

```bash
# Rebuild the addon once
cd storybook-design-tokens
npm run build

# Then refresh browser or restart Storybook
cd your-project
npm run storybook
```

**Note:** The addon uses a default export with inline functions to prevent duplicate declaration errors when using `npm link`. All helper functions are scoped within the decorator to avoid module-level const conflicts.
