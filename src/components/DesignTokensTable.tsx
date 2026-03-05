import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Badge, IconButton } from 'storybook/internal/components';
import { SearchIcon } from '@storybook/icons';
import { styled, type StorybookTheme } from 'storybook/theming';
import type { ParsedToken } from '../types.js';
import { useVirtualRows } from '../hooks/useVirtualRows.js';
import {
  ScrollContainer,
  StyledTable,
  StyledThead,
  HeaderRow,
  StyledTh,
  StyledTr as StyledTrBase,
  StyledTd,
} from './TablePrimitives.js';

// Helper to cast theme to StorybookTheme
const t = (theme: unknown) => theme as StorybookTheme;

// ── Extended row with hover ──────────────────────────────────────────

const StyledTr = styled(StyledTrBase)(({ theme }) => ({
  transition: 'background-color 0.1s',
  '&:hover': {
    backgroundColor: t(theme).background.hoverable,
  },
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

const PreviewContainer = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
  overflow: 'hidden',
});

const PreviewCode = styled.code(({ theme }) => ({
  fontSize: 12,
  color: t(theme).color.mediumdark,
  fontFamily: t(theme).typography.fonts.mono,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  display: 'block',
  minWidth: 0,
}));

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

const ClassList = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 3,
  fontSize: 10,
  fontFamily: t(theme).typography.fonts.mono,
  color: t(theme).color.defaultText,
}));

const ClassTag = styled.span(({ theme }) => ({
  display: 'inline-block',
  padding: '1px 5px',
  backgroundColor: `${t(theme).color.secondary}15`,
  border: `1px solid ${t(theme).color.secondary}33`,
  borderRadius: 3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 160,
  fontSize: 10,
}));

const InspectContainer = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
});

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

const Spacer = styled.tr<{ $height: number }>(({ $height }) => ({
  display: 'block',
  height: $height,
}));

export type ElementInfo = {
  elementSelector: string;
  elementSelectors: string[];
  elementCount: number;
};

export interface DesignTokensTableProps {
  tokens: ParsedToken[];
  usedTokenNames: Set<string>;
  elementInfoMap: Map<string, ElementInfo>;
  onHighlight?: (token: ParsedToken) => void;
  onClearHighlight?: () => void;
}

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

export function DesignTokensTable({
  tokens,
  usedTokenNames,
  elementInfoMap,
  onHighlight,
  onClearHighlight,
}: Readonly<DesignTokensTableProps>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [highlightedToken, setHighlightedToken] = useState<string | null>(null);

  const { startIndex, endIndex, topPadding, bottomPadding } = useVirtualRows(scrollRef, tokens.length);

  // Reset highlight state when tokens change
  useEffect(() => {
    setHighlightedToken(null);
  }, [tokens]);

  const handleHighlight = useCallback(
    (token: ParsedToken) => {
      if (highlightedToken === token.name) {
        setHighlightedToken(null);
        onClearHighlight?.();
      } else {
        setHighlightedToken(token.name);
        onHighlight?.(token);
      }
    },
    [highlightedToken, onHighlight, onClearHighlight],
  );

  const visibleTokens = tokens.slice(startIndex, endIndex + 1);

  return (
    <ScrollContainer ref={scrollRef}>
      <StyledTable aria-label="Design Tokens">
        <StyledThead>
          <HeaderRow>
            <StyledTh>Token</StyledTh>
            <StyledTh>Refs</StyledTh>
            <StyledTh>Primitive</StyledTh>
            <StyledTh>Value</StyledTh>
            <StyledTh>Status</StyledTh>
            <StyledTh>Classes</StyledTh>
            <StyledTh>Inspect</StyledTh>
          </HeaderRow>
        </StyledThead>
        <tbody>
          {tokens.length > 0 && (
            <>
              {topPadding > 0 && <Spacer $height={topPadding} />}
              {visibleTokens.map((token) => {
                const used = usedTokenNames.has(token.name);
                const displayValue = token.primitiveValue ?? token.value;
                const isHighlighted = highlightedToken === token.name;

                const referenceChain = token.referenceChain ?? [];
                const chainDisplay = referenceChain.length > 0 ? referenceChain.map((r) => `--${r}`).join('\n') : '—';
                const chainTitle =
                  referenceChain.length > 0
                    ? referenceChain.map((r) => `--${r}`).join(' → ')
                    : 'No intermediate references';

                return (
                  <StyledTr key={token.name}>
                    <StyledTd>
                      <TokenName $unused={!used} title={`--${token.name}`}>
                        --{token.name}
                      </TokenName>
                    </StyledTd>
                    <StyledTd>
                      <SecondaryTokenName $unused={!used} title={chainTitle}>
                        {chainDisplay}
                      </SecondaryTokenName>
                    </StyledTd>
                    <StyledTd>
                      <SecondaryTokenName
                        $unused={!used}
                        title={token.primitiveName ? `--${token.primitiveName}` : 'Direct value'}
                      >
                        {token.primitiveName ? `--${token.primitiveName}` : '—'}
                      </SecondaryTokenName>
                    </StyledTd>
                    <StyledTd>
                      <div title={displayValue}>
                        <TokenValuePreview token={token} value={displayValue} />
                      </div>
                    </StyledTd>
                    <StyledTd>
                      <Badge compact status={used ? 'positive' : 'neutral'}>
                        {used ? '✓' : '—'}
                      </Badge>
                    </StyledTd>
                    <StyledTd>
                      {token.classNames && token.classNames.length > 0 ? (
                        <ClassList title={token.classNames.join('\n')}>
                          {token.classNames.slice(0, 4).map((cls) => (
                            <ClassTag key={cls}>{cls}</ClassTag>
                          ))}
                          {token.classNames.length > 4 && (
                            <span style={{ opacity: 0.6, fontSize: 10 }}>+{token.classNames.length - 4} more</span>
                          )}
                        </ClassList>
                      ) : (
                        <span style={{ opacity: 0.4, fontSize: 11 }}>—</span>
                      )}
                    </StyledTd>
                    <StyledTd>
                      {used && (
                        <InspectContainer>
                          <IconButton
                            variant="ghost"
                            size="small"
                            aria-label={isHighlighted ? 'Clear highlight' : 'Highlight elements using this token'}
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleHighlight(token);
                            }}
                          >
                            <SearchIcon />
                          </IconButton>
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
                    </StyledTd>
                  </StyledTr>
                );
              })}
              {bottomPadding > 0 && <Spacer $height={bottomPadding} />}
            </>
          )}
        </tbody>
      </StyledTable>
    </ScrollContainer>
  );
}
