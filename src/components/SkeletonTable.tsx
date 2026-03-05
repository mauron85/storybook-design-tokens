import React from 'react';
import { styled, keyframes, type StorybookTheme } from 'storybook/theming';
import {
  HEADERS,
  ScrollContainer,
  StyledTable,
  StyledThead,
  HeaderRow,
  StyledTh,
  StyledTr,
  StyledTd,
} from './TablePrimitives.js';

const t = (theme: unknown) => theme as StorybookTheme;

const SKELETON_ROW_COUNT = 12;

// ── Shimmer animation ────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

// ── Shared shimmer mixin ─────────────────────────────────────────────

const shimmerBg = (theme: StorybookTheme) => {
  const text = t(theme).color.defaultText;
  const bg = t(theme).background.content;
  return {
    background: `linear-gradient(90deg, color-mix(in srgb, ${text} 7%, ${bg}) 25%, color-mix(in srgb, ${text} 14%, ${bg}) 50%, color-mix(in srgb, ${text} 7%, ${bg}) 75%)`,
    backgroundSize: '800px 100%',
    animationName: shimmer,
    animationDuration: '1.6s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
  } as const;
};

// ── Skeleton shapes ──────────────────────────────────────────────────

const SkeletonBar = styled.div<{ $width?: string; $height?: number }>(({ theme, $width = '80%', $height = 14 }) => ({
  height: $height,
  width: $width,
  borderRadius: 4,
  ...shimmerBg(t(theme)),
}));

const SkeletonBadge = styled.div(({ theme }) => ({
  height: 20,
  width: 28,
  borderRadius: 10,
  ...shimmerBg(t(theme)),
}));

const SkeletonSwatch = styled.div(({ theme }) => ({
  height: 24,
  width: 24,
  borderRadius: 4,
  ...shimmerBg(t(theme)),
}));

const PreviewCell = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

// ── Filter toolbar skeleton ──────────────────────────────────────────

const ToolbarWrapper = styled.div({
  display: 'flex',
  flexDirection: 'column' as const,
  padding: '6px 12px',
});

const ToolbarRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 0',
  borderBottom: `1px solid ${t(theme).appBorderColor}`,
}));

const SkeletonInput = styled.div(({ theme }) => ({
  flex: 1,
  height: 32,
  borderRadius: 4,
  border: `1px solid ${t(theme).appBorderColor}`,
  ...shimmerBg(t(theme)),
}));

const ToolbarSeparator = styled.div(({ theme }) => ({
  width: 1,
  height: 24,
  backgroundColor: t(theme).appBorderColor,
  flexShrink: 0,
}));

const SkeletonSelect = styled.div(({ theme }) => ({
  width: 160,
  height: 32,
  borderRadius: 4,
  border: `1px solid ${t(theme).appBorderColor}`,
  flexShrink: 0,
  ...shimmerBg(t(theme)),
}));

const TokenCountRow = styled.div({
  padding: '4px 12px',
  minHeight: 24,
  display: 'flex',
  gap: 6,
  alignItems: 'center',
});

// ── Table data ───────────────────────────────────────────────────────

// Vary widths per row for a more natural look
const ROW_WIDTHS: string[][] = [
  ['75%', '60%', '50%', '70%', '', '55%', '40%'],
  ['90%', '45%', '65%', '80%', '', '70%', '30%'],
  ['60%', '70%', '40%', '55%', '', '45%', '50%'],
  ['85%', '50%', '55%', '65%', '', '60%', '35%'],
];

export const SkeletonTable: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
    {/* Skeleton filter toolbar – mirrors FilterToolbar layout */}
    <ToolbarWrapper>
      <ToolbarRow>
        <SkeletonInput />
        <ToolbarSeparator />
        <SkeletonSelect />
      </ToolbarRow>
      <TokenCountRow>
        <SkeletonBar $width="90px" $height={11} />
        <SkeletonBar $width="60px" $height={11} />
        <SkeletonBar $width="70px" $height={11} />
      </TokenCountRow>
    </ToolbarWrapper>

    <ScrollContainer>
      <StyledTable>
        <StyledThead>
          <HeaderRow>
            {HEADERS.map((h) => (
              <StyledTh key={h}>{h}</StyledTh>
            ))}
          </HeaderRow>
        </StyledThead>
        <tbody>
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => {
            const widths = ROW_WIDTHS[i % ROW_WIDTHS.length]!;
            const delay = `${i * 0.05}s`;
            return (
              <StyledTr key={i}>
                <StyledTd>
                  <SkeletonBar $width={widths[0]} style={{ animationDelay: delay }} />
                </StyledTd>
                <StyledTd>
                  <SkeletonBar $width={widths[1]} style={{ animationDelay: delay }} />
                </StyledTd>
                <StyledTd>
                  <SkeletonBar $width={widths[2]} style={{ animationDelay: delay }} />
                </StyledTd>
                <StyledTd>
                  <PreviewCell>
                    <SkeletonSwatch style={{ animationDelay: delay }} />
                    <SkeletonBar $width={widths[3]} style={{ animationDelay: delay }} />
                  </PreviewCell>
                </StyledTd>
                <StyledTd>
                  <SkeletonBadge style={{ animationDelay: delay }} />
                </StyledTd>
                <StyledTd>
                  <SkeletonBar $width={widths[5]} style={{ animationDelay: delay }} />
                </StyledTd>
                <StyledTd>
                  <SkeletonBar $width={widths[6]} style={{ animationDelay: delay }} />
                </StyledTd>
              </StyledTr>
            );
          })}
        </tbody>
      </StyledTable>
    </ScrollContainer>
  </div>
);
