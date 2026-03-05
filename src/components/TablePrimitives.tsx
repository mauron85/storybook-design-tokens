import { ROW_HEIGHT } from '../hooks/useVirtualRows';
import { styled, type StorybookTheme } from 'storybook/theming';

// Helper to cast theme to StorybookTheme
const t = (theme: unknown) => theme as StorybookTheme;

// ── Shared constants ─────────────────────────────────────────────────
export const GRID_TEMPLATE = '2fr 2fr 1fr 1fr 60px 1fr 1fr';
export const HEADERS = ['Token', 'Refs', 'Primitive', 'Value', 'Status', 'Classes', 'Inspect'] as const;

// ── Shared styled components ─────────────────────────────────────────

export const ScrollContainer = styled.div(({ theme }) => ({
  flex: 1,
  border: `1px solid ${t(theme).appBorderColor}`,
  borderRadius: 8,
  overflow: 'auto',
  backgroundColor: t(theme).background.content,
  minHeight: 0,
}));

export const StyledTable = styled.table(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: t(theme).typography.fonts.base,
  tableLayout: 'fixed' as const,
}));

export const StyledThead = styled.thead(({ theme }) => ({
  backgroundColor: t(theme).background.app,
  position: 'sticky',
  top: 0,
  zIndex: 1,
}));

export const HeaderRow = styled.tr({
  display: 'grid',
  gridTemplateColumns: GRID_TEMPLATE,
});

export const StyledTh = styled.th(({ theme }) => ({
  padding: '12px 8px',
  textAlign: 'left' as const,
  fontWeight: 600,
  color: t(theme).color.defaultText,
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  backgroundColor: t(theme).background.app,
  borderBottom: `1px solid ${t(theme).appBorderColor}`,
  overflow: 'hidden',
  whiteSpace: 'nowrap' as const,
}));

export const StyledTr = styled.tr(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: GRID_TEMPLATE,
  height: ROW_HEIGHT,
  borderBottom: `1px solid ${t(theme).appBorderColor}`,
  alignItems: 'center',
}));

export const StyledTd = styled.td({
  padding: '10px 8px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
  boxSizing: 'border-box',
});
