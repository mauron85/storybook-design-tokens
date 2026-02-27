import type { Preview } from '@storybook/react-vite';
import '../packages/theme/theme.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    designTokens: {
      themeCssPath: '/theme/theme.css',
      showUnusedByDefault: false,
    },
  },
  initialGlobals: {
    background: { value: 'light' },
  },
};

export default preview;
