import { styled } from 'storybook/theming';

export const Spinner = styled.div(({ theme }) => ({
  width: 32,
  height: 32,
  border: `3px solid ${theme.appBorderColor}`,
  borderTopColor: theme.color.secondary,
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  '@keyframes spin': {
    to: { transform: 'rotate(360deg)' },
  },
}));
