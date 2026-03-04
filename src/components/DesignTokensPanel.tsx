import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { EmptyTabContent } from 'storybook/internal/components';
import type { Channel } from 'storybook/internal/channels';
import { styled, type StorybookTheme } from 'storybook/theming';
import {
  Cell,
  Column,
  ColumnResizer,
  Row,
  Table,
  TableBody,
  TableHeader,
  ResizableTableContainer,
  Select,
  SelectValue,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components';
import type { CssDesignTokenMap, ParsedToken } from '../types.js';
import { EVENTS } from '../constants.js';

// Helper to cast theme to StorybookTheme
const t = (theme: unknown) => theme as StorybookTheme;

// Column width constants (in pixels) - default widths for resizable columns
const COL_TOKEN = '2fr';
const COL_REFS = '2fr';
const COL_PRIMITIVE = '1fr';
const COL_VALUE = '1fr';
const COL_STATUS = 50;
const COL_INSPECT = '1fr';

// Styled ResizableTableContainer
const StyledResizableTableContainer = styled(ResizableTableContainer)(({ theme }) => ({
  flex: 1,
  border: `1px solid ${t(theme).appBorderColor}`,
  borderRadius: 8,
  overflow: 'auto',
  backgroundColor: t(theme).background.content,
  minHeight: 0,
  maxHeight: 'calc(100vh - 220px)',
  position: 'relative',
}));

// Styled react-aria table components
const StyledTable = styled(Table)(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: t(theme).typography.fonts.base,
}));

const StyledTableHeader = styled(TableHeader)(({ theme }) => ({
  backgroundColor: t(theme).background.app,
  position: 'sticky',
  top: 0,
  zIndex: 1,
}));

// Column styles as CSS object
const columnBaseStyles = (theme: StorybookTheme) => ({
  padding: '12px 8px',
  textAlign: 'left' as const,
  fontWeight: 600,
  color: theme.color.defaultText,
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  backgroundColor: theme.background.app,
  borderBottom: `1px solid ${theme.appBorderColor}`,
  borderRight: `1px solid ${theme.appBorderColor}`,
  boxSizing: 'border-box' as const,
  overflow: 'hidden' as const,
  whiteSpace: 'nowrap' as const,
  position: 'relative' as const,
});

// StyledColumn using type cast to preserve Column props like allowsResizing
const StyledColumn = styled(Column)(({ theme }) => ({
  ...columnBaseStyles(t(theme)),
  '&:last-child': {
    borderRight: 'none',
  },
  '&:focus-visible': {
    outline: `2px solid ${t(theme).color.secondary}`,
    outlineOffset: -2,
  },
})) as typeof Column;

const StyledColumnResizer = styled(ColumnResizer)(({ theme }) => ({
  width: 6,
  height: '100%',
  position: 'absolute',
  right: 0,
  top: 0,
  cursor: 'col-resize',
  backgroundColor: 'transparent',
  '&:hover, &[data-resizing]': {
    backgroundColor: t(theme).color.secondary,
  },
  '&[data-focus-visible]': {
    outline: `2px solid ${t(theme).color.secondary}`,
  },
}));

const StyledTableRow = styled(Row)(({ theme }) => ({
  borderBottom: `1px solid ${t(theme).appBorderColor}`,
  transition: 'background-color 0.1s',
  '&:hover': {
    backgroundColor: t(theme).background.hoverable,
  },
}));

const StyledTableCell = styled(Cell)(({ theme }) => ({
  padding: '10px 8px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  boxSizing: 'border-box',
  borderRight: `1px solid ${t(theme).appBorderColor}`,
  '&:last-child': {
    borderRight: 'none',
  },
}));

// Styled components using Storybook theming
const Container = styled.div(({ theme }) => ({
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  backgroundColor: t(theme).background.app,
  color: t(theme).color.defaultText,
  height: '100%',
  overflow: 'auto',
}));

const Toolbar = styled.div({
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
});

const SearchInput = styled.input(({ theme }) => ({
  flex: 1,
  minWidth: 200,
  padding: '8px 12px',
  border: `1px solid ${t(theme).appBorderColor}`,
  borderRadius: 6,
  fontSize: 13,
  outline: 'none',
  background: t(theme).input.background,
  color: t(theme).input.color,
  '&:focus': {
    borderColor: t(theme).color.secondary,
    boxShadow: `0 0 0 3px ${t(theme).color.secondary}22`,
  },
}));

const StyledSelect = styled(Select)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
}));

const SelectTrigger = styled(Button)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  border: `1px solid ${t(theme).appBorderColor}`,
  borderRadius: 6,
  fontSize: 12,
  background: t(theme).input.background,
  color: t(theme).input.color,
  cursor: 'pointer',
  outline: 'none',
  minWidth: 140,
  justifyContent: 'space-between',
  '&:hover': {
    borderColor: t(theme).color.mediumdark,
  },
  '&[data-focus-visible]': {
    borderColor: t(theme).color.secondary,
    boxShadow: `0 0 0 2px ${t(theme).color.secondary}22`,
  },
}));

const SelectPopover = styled(Popover)(({ theme }) => ({
  backgroundColor: t(theme).background.content,
  border: `1px solid ${t(theme).appBorderColor}`,
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  overflow: 'hidden',
  minWidth: 160,
}));

const SelectListBox = styled(ListBox)(({ theme }) => ({
  outline: 'none',
  padding: 4,
}));

const SelectItem = styled(ListBoxItem)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '8px 12px',
  fontSize: 12,
  borderRadius: 4,
  cursor: 'pointer',
  outline: 'none',
  color: t(theme).color.defaultText,
  '&[data-hovered]': {
    backgroundColor: t(theme).background.hoverable,
  },
  '&[data-selected]': {
    backgroundColor: `${t(theme).color.secondary}22`,
    color: t(theme).color.secondary,
  },
  '&[data-focus-visible]': {
    outline: `2px solid ${t(theme).color.secondary}`,
    outlineOffset: -2,
  },
}));

const Stats = styled.div(({ theme }) => ({
  fontSize: 12,
  color: t(theme).color.mediumdark,
  padding: '8px 0',
}));

const TokenName = styled.span<{ $unused?: boolean }>(({ theme, $unused }) => ({
  fontFamily: t(theme).typography.fonts.mono,
  fontSize: 12,
  color: t(theme).color.defaultText,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'block',
  opacity: $unused ? 0.5 : 1,
}));

const SecondaryTokenName = styled.span<{ $unused?: boolean }>(({ theme, $unused }) => ({
  fontFamily: t(theme).typography.fonts.mono,
  fontSize: 12,
  color: t(theme).color.mediumdark,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  display: 'block',
  opacity: $unused ? 0.5 : 1,
}));

const Badge = styled.span<{ $used?: boolean }>(({ theme, $used }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  backgroundColor: $used ? `${t(theme).color.positive}22` : t(theme).background.app,
  color: $used ? t(theme).color.positive : t(theme).color.mediumdark,
}));

const HighlightButton = styled.button<{ $active?: boolean }>(({ theme, $active }) => ({
  background: $active ? `${t(theme).color.secondary}22` : 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  borderRadius: 4,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s',
  color: $active ? t(theme).color.secondary : t(theme).color.mediumdark,
  '&:hover': {
    backgroundColor: $active ? `${t(theme).color.secondary}22` : 'rgba(0,0,0,0.05)',
  },
}));

const HighlightIndicator = styled.span(({ theme }) => ({
  fontSize: 11,
  color: t(theme).color.secondary,
  fontFamily: t(theme).typography.fonts.mono,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 150,
}));

const ElementList = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  fontSize: 10,
  fontFamily: t(theme).typography.fonts.mono,
  color: t(theme).color.secondary,
  maxHeight: 80,
  overflowY: 'auto',
}));

const ElementTag = styled.span(({ theme }) => ({
  display: 'inline-block',
  padding: '1px 4px',
  backgroundColor: `${t(theme).color.secondary}11`,
  borderRadius: 3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 140,
}));

const GroupHeaderRow = styled(Row)(({ theme }) => ({
  // display: 'flex',
  width: '100%',
  // minWidth: TABLE_WIDTH,
  backgroundColor: t(theme).background.app,
  borderBottom: `1px solid ${t(theme).appBorderColor}`,
}));

const GroupHeaderSpanCell = styled(Cell)(({ theme }) => ({
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: t(theme).color.mediumdark,
  backgroundColor: t(theme).background.app,
  display: 'table-cell',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '1 1 100%',
  width: '100%',
  gridColumn: '1 / -1', // Span all grid columns if grid layout
}));

const GroupHeaderContent = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const GroupBadge = styled.span<{ $variant: 'component' | 'theme' }>(({ theme, $variant }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 600,
  backgroundColor: $variant === 'component' ? `${t(theme).color.secondary}22` : `${t(theme).color.positive}22`,
  color: $variant === 'component' ? t(theme).color.secondary : t(theme).color.positive,
}));

const LoaderContainer = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  padding: 48,
  color: t(theme).color.mediumdark,
  fontSize: 13,
}));

const Spinner = styled.div(({ theme }) => ({
  width: 32,
  height: 32,
  border: `3px solid ${t(theme).appBorderColor}`,
  borderTopColor: t(theme).color.secondary,
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  '@keyframes spin': {
    to: { transform: 'rotate(360deg)' },
  },
}));

const PreviewCode = styled.code(({ theme }) => ({
  fontSize: 12,
  color: t(theme).color.mediumdark,
}));

const PreviewContainer = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const ColorSwatch = styled.div<{ $color: string }>(({ $color }) => ({
  width: 24,
  height: 24,
  borderRadius: 4,
  backgroundColor: $color,
  border: '1px solid rgba(0,0,0,0.15)',
  flexShrink: 0,
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
}));

const ShadowSwatch = styled.div<{ $shadow: string }>(({ theme, $shadow }) => ({
  width: 32,
  height: 24,
  borderRadius: 4,
  backgroundColor: t(theme).background.content,
  boxShadow: $shadow,
  border: `1px solid ${t(theme).appBorderColor}`,
  flexShrink: 0,
}));

const RadiusSwatch = styled.div<{ $radius: string }>(({ theme, $radius }) => ({
  width: 24,
  height: 24,
  borderRadius: $radius,
  backgroundColor: t(theme).color.medium,
  border: `2px solid ${t(theme).color.mediumdark}`,
  flexShrink: 0,
}));

const SpacingSwatch = styled.div<{ $width: string }>(({ theme, $width }) => ({
  width: $width,
  maxWidth: 80,
  minWidth: 4,
  height: 16,
  backgroundColor: t(theme).color.secondary,
  borderRadius: 2,
  flexShrink: 0,
}));

const BorderSwatch = styled.div<{ $border: string }>(({ $border }) => ({
  width: 32,
  height: 24,
  border: $border,
  borderRadius: 2,
  flexShrink: 0,
}));

const InspectContainer = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
});

interface Props {
  channel: Channel;
  allTokens: ParsedToken[];
  tokenMap: CssDesignTokenMap;
}

type FilterMode = 'story' | 'component' | 'all';

const FILTER_OPTIONS = [
  { id: 'story' as const, label: 'Current Story' },
  { id: 'component' as const, label: 'Component Tokens' },
  { id: 'all' as const, label: 'All Tokens' },
];

// Determine if a value looks like a color
function isColorValue(value: string): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return (
    v.startsWith('#') ||
    v.startsWith('rgb') ||
    v.startsWith('hsl') ||
    v.startsWith('oklch') ||
    v.startsWith('oklab') ||
    v.startsWith('lch') ||
    v.startsWith('lab') ||
    v.startsWith('color(') ||
    /^(transparent|currentcolor|inherit)$/i.test(v)
  );
}

// Determine if a value looks like a font-size or spacing
function isSizeValue(value: string): boolean {
  if (!value) return false;
  return /^-?[\d.]+\s*(px|rem|em|%|vw|vh|ch|ex|cap|ic|lh|rlh|vi|vb|vmin|vmax)$/i.test(value.trim());
}

// Determine if token name suggests it's a font-related token
function isFontToken(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('font') || lower.includes('typography') || lower.includes('text');
}

// Determine if token name suggests it's a radius token
function isRadiusToken(name: string): boolean {
  return name.toLowerCase().includes('radius');
}

// Determine if token name suggests it's a spacing token
function isSpacingToken(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('space') || lower.includes('gap') || lower.includes('padding') || lower.includes('margin');
}

// Determine if token name suggests it's a shadow token
function isShadowToken(name: string): boolean {
  return name.toLowerCase().includes('shadow');
}

// Determine if token name suggests it's a border token
function isBorderToken(name: string): boolean {
  return name.toLowerCase().includes('border');
}

// Render a preview for the token value
function TokenValuePreview({ token, value }: Readonly<{ token: ParsedToken; value: string }>) {
  const name = token.name;

  // Color preview
  if (isColorValue(value) || token.category === 'color') {
    return (
      <PreviewContainer>
        <ColorSwatch $color={value} title={value} />
        <PreviewCode>{value}</PreviewCode>
      </PreviewContainer>
    );
  }

  // Shadow preview
  if (isShadowToken(name)) {
    return (
      <PreviewContainer>
        <ShadowSwatch $shadow={value} title={value} />
        <PreviewCode style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</PreviewCode>
      </PreviewContainer>
    );
  }

  // Border radius preview
  if (isRadiusToken(name) && isSizeValue(value)) {
    return (
      <PreviewContainer>
        <RadiusSwatch $radius={value} title={value} />
        <PreviewCode>{value}</PreviewCode>
      </PreviewContainer>
    );
  }

  // Spacing preview
  if (isSpacingToken(name) && isSizeValue(value)) {
    return (
      <PreviewContainer>
        <SpacingSwatch $width={value} title={value} />
        <PreviewCode>{value}</PreviewCode>
      </PreviewContainer>
    );
  }

  // Font size preview
  if (isFontToken(name) && isSizeValue(value)) {
    return (
      <PreviewContainer>
        <span
          style={{
            fontSize: value,
            lineHeight: 1.2,
            fontFamily: 'inherit',
            maxWidth: 100,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Aa
        </span>
        <PreviewCode>{value}</PreviewCode>
      </PreviewContainer>
    );
  }

  // Border preview
  if (isBorderToken(name) && value.includes('px')) {
    const borderValue = value.includes('solid') || value.includes('dashed') ? value : `${value} solid currentColor`;
    return (
      <PreviewContainer>
        <BorderSwatch $border={borderValue} title={value} />
        <PreviewCode>{value}</PreviewCode>
      </PreviewContainer>
    );
  }

  // Default: just show the value
  return <PreviewCode>{value}</PreviewCode>;
}

export function DesignTokensPanel({ allTokens, tokenMap, channel }: Readonly<Props>) {
  const [query, setQuery] = useState('');
  // Filter mode: story (used tokens), component (component-local), or all
  const [filterMode, setFilterMode] = useState<FilterMode>('story');
  const [highlightedToken, setHighlightedToken] = useState<string | null>(null);
  const [elementInfoMap, setElementInfoMap] = useState<
    Map<string, { elementSelector: string; elementSelectors: string[]; elementCount: number }>
  >(new Map());

  // Reset highlight state when story changes (allTokens changes)
  useEffect(() => {
    setHighlightedToken(null);
    setElementInfoMap(new Map());
  }, [allTokens]);

  // Listen for element info from preview
  useEffect(() => {
    const handleElementInfo = (info: {
      tokenName: string;
      elementSelector: string;
      elementSelectors?: string[];
      elementCount: number;
    }) => {
      setElementInfoMap((prev) => {
        const next = new Map(prev);
        next.set(info.tokenName, {
          elementSelector: info.elementSelector,
          elementSelectors: info.elementSelectors ?? [info.elementSelector],
          elementCount: info.elementCount,
        });
        return next;
      });
    };
    channel.on(EVENTS.ELEMENT_INFO, handleElementInfo);
    return () => {
      channel.off(EVENTS.ELEMENT_INFO, handleElementInfo);
    };
  }, [channel]);

  const handleHighlight = useCallback(
    (token: ParsedToken) => {
      if (highlightedToken === token.name) {
        // Toggle off
        setHighlightedToken(null);
        channel.emit(EVENTS.CLEAR_HIGHLIGHT);
      } else {
        // Highlight this token
        setHighlightedToken(token.name);
        const tokenValue = token.primitiveValue ?? token.value;
        channel.emit(EVENTS.HIGHLIGHT, { tokenName: token.name, tokenValue });
      }
    },
    [channel, highlightedToken],
  );

  // Group tokens by source: component tokens first, then theme tokens
  // Create flat list with group headers as special items
  type TableItem =
    | { type: 'header'; id: string; label: string; count: number; variant: 'component' | 'theme' }
    | { type: 'token'; id: string; token: ParsedToken };

  const usedTokenNames = useMemo(() => {
    const names = new Set<string>();
    if (!tokenMap?.components) return names;

    const components = tokenMap.components;
    for (let i = 0; i < components.length; i++) {
      const componentTokens = components[i].tokens;
      for (const key in componentTokens) {
        if (key === 'root') {
          const rootGroup = componentTokens[key] as Record<string, string>;
          for (const varName in rootGroup) {
            const value = rootGroup[varName];
            // Strip '--' prefix to match allTokens[i].name format
            if (value.startsWith('--')) {
              names.add(value.replace(/^--/, ''));
            }
          }
        } else {
          const propValues = componentTokens[key] as string[];
          for (let j = 0; j < propValues.length; j++) {
            // Strip '--' prefix to match allTokens[i].name format
            names.add(propValues[j].replace(/^--/, ''));
          }
        }
      }
    }
    return names;
  }, [tokenMap]);
  console.log(usedTokenNames);

  const tableItems = useMemo((): TableItem[] => {
    // Filter out private tokens (starting with underscore)
    const publicTokens = allTokens.filter((token) => !token.name.startsWith('_'));

    // Apply filter mode
    let base: ParsedToken[];
    switch (filterMode) {
      case 'story':
        // Show only tokens used in the current story
        base = publicTokens.filter((token) => usedTokenNames.has(token.name));
        break;
      case 'component':
        // Show only component-local tokens
        base = publicTokens.filter((token) => token.source === 'component');
        break;
      case 'all':
      default:
        // Show all tokens
        base = publicTokens;
        break;
    }

    let filtered = base;
    if (query.trim()) {
      const needle = query.toLowerCase();
      filtered = base.filter(
        (token) =>
          token.name.toLowerCase().includes(needle) ||
          token.category.toLowerCase().includes(needle) ||
          token.value.toLowerCase().includes(needle) ||
          token.primitiveName?.toLowerCase().includes(needle),
      );
    }

    const componentTokens = filtered.filter((t) => t.source === 'component');
    const themeTokens = filtered.filter((t) => t.source !== 'component');

    const items: TableItem[] = [];

    if (componentTokens.length > 0) {
      items.push({
        type: 'header',
        id: 'header-component',
        label: 'Component Tokens',
        count: componentTokens.length,
        variant: 'component',
      });
      componentTokens.forEach((token, i) => {
        items.push({ type: 'token', id: `component-${token.name}-${i}`, token });
      });
    }

    if (themeTokens.length > 0) {
      items.push({
        type: 'header',
        id: 'header-theme',
        label: 'Theme Tokensss',
        count: themeTokens.length,
        variant: 'theme',
      });
      themeTokens.forEach((token, i) => {
        items.push({ type: 'token', id: `theme-${token.name}-${i}`, token });
      });
    }

    return items;
  }, [allTokens, query, filterMode, usedTokenNames]);

  const visibleTokens = useMemo(
    () =>
      tableItems
        .filter((item): item is TableItem & { type: 'token' } => item.type === 'token')
        .map((item) => item.token),
    [tableItems],
  );

  const usedCount = useMemo(
    () => visibleTokens.filter((t) => usedTokenNames.has(t.name)).length,
    [visibleTokens, usedTokenNames],
  );

  if (!allTokens.length) {
    return (
      <Container>
        <LoaderContainer>
          <Spinner />
          <span>Loading tokens...</span>
        </LoaderContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Toolbar>
        <SearchInput
          type="text"
          placeholder="Search tokens..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <StyledSelect
          selectedKey={filterMode}
          onSelectionChange={(key) => setFilterMode(key as FilterMode)}
          aria-label="Filter tokens"
        >
          <SelectTrigger>
            <SelectValue />
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path
                d="M2.5 4.5L6 8L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </SelectTrigger>
          <SelectPopover>
            <SelectListBox>
              {FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.id} id={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectListBox>
          </SelectPopover>
        </StyledSelect>
      </Toolbar>

      <Stats>
        Showing {visibleTokens.length} tokens ({usedCount} used, {visibleTokens.length - usedCount} unused)
      </Stats>

      {visibleTokens.length === 0 ? (
        <EmptyTabContent
          title="No tokens match your filter"
          description="Try adjusting your search or toggle options."
        />
      ) : (
        <StyledResizableTableContainer>
          <StyledTable aria-label="Design Tokens">
            <StyledTableHeader>
              <StyledColumn isRowHeader defaultWidth={COL_TOKEN}>
                Token
                <StyledColumnResizer />
              </StyledColumn>
              <StyledColumn defaultWidth={COL_REFS}>
                Refs
                <StyledColumnResizer />
              </StyledColumn>
              <StyledColumn defaultWidth={COL_PRIMITIVE}>
                Primitive
                <StyledColumnResizer />
              </StyledColumn>
              <StyledColumn defaultWidth={COL_VALUE}>
                Value
                <StyledColumnResizer />
              </StyledColumn>
              <StyledColumn defaultWidth={COL_STATUS}>
                Status
                <StyledColumnResizer />
              </StyledColumn>
              <StyledColumn defaultWidth={COL_INSPECT}>Inspect</StyledColumn>
            </StyledTableHeader>
            <TableBody items={tableItems}>
              {(item: TableItem) => {
                // Render group header row
                if (item.type === 'header') {
                  return (
                    <GroupHeaderRow id={item.id}>
                      <GroupHeaderSpanCell colSpan={6}>
                        <GroupHeaderContent>
                          <GroupBadge $variant={item.variant}>{item.label}</GroupBadge>
                          <span>({item.count})</span>
                        </GroupHeaderContent>
                      </GroupHeaderSpanCell>
                    </GroupHeaderRow>
                  );
                }

                // Render token row
                const token = item.token;
                const used = usedTokenNames.has(token.name);
                const displayValue = token.primitiveValue ?? token.value;
                const isHighlighted = highlightedToken === token.name;

                // Build reference chain display - one per line
                const referenceChain = token.referenceChain ?? [];
                const chainDisplay = referenceChain.length > 0 ? referenceChain.map((r) => `--${r}`).join('\n') : '—';
                const chainTitle =
                  referenceChain.length > 0
                    ? referenceChain.map((r) => `--${r}`).join(' → ')
                    : 'No intermediate references';

                return (
                  <StyledTableRow id={item.id}>
                    <StyledTableCell>
                      <TokenName $unused={!used} title={`--${token.name}`}>
                        --{token.name}
                      </TokenName>
                    </StyledTableCell>
                    <StyledTableCell>
                      <SecondaryTokenName $unused={!used} title={chainTitle}>
                        {chainDisplay}
                      </SecondaryTokenName>
                    </StyledTableCell>
                    <StyledTableCell>
                      <SecondaryTokenName
                        $unused={!used}
                        title={token.primitiveName ? `--${token.primitiveName}` : 'Direct value'}
                      >
                        {token.primitiveName ? `--${token.primitiveName}` : '—'}
                      </SecondaryTokenName>
                    </StyledTableCell>
                    <StyledTableCell>
                      <div title={displayValue}>
                        <TokenValuePreview token={token} value={displayValue} />
                      </div>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Badge $used={used} title={used ? 'Used in component' : 'Not used in component'}>
                        {used ? '✓' : '—'}
                      </Badge>
                    </StyledTableCell>
                    <StyledTableCell>
                      {used && (
                        <InspectContainer>
                          <HighlightButton
                            type="button"
                            $active={isHighlighted}
                            title={isHighlighted ? 'Clear highlight' : 'Highlight elements using this token'}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleHighlight(token);
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                          </HighlightButton>
                          {elementInfoMap.has(token.name) && (
                            <ElementList title={elementInfoMap.get(token.name)!.elementSelectors.join('\n')}>
                              {elementInfoMap
                                .get(token.name)!
                                .elementSelectors.slice(0, 5)
                                .map((selector) => (
                                  <ElementTag key={selector}>{selector}</ElementTag>
                                ))}
                              {elementInfoMap.get(token.name)!.elementSelectors.length > 5 && (
                                <span style={{ opacity: 0.6 }}>
                                  +{elementInfoMap.get(token.name)!.elementSelectors.length - 5} more
                                </span>
                              )}
                            </ElementList>
                          )}
                        </InspectContainer>
                      )}
                    </StyledTableCell>
                  </StyledTableRow>
                );
              }}
            </TableBody>
          </StyledTable>
        </StyledResizableTableContainer>
      )}
    </Container>
  );
}
