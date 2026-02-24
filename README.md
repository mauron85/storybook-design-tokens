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

