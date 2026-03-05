import React, { type ChangeEvent, type FC } from 'react';
import { Bar, Form, Separator } from 'storybook/internal/components';
import { styled, type StorybookTheme } from 'storybook/theming';
import type { FilterMode } from '../hooks/useFilteredTokens';

const t = (theme: unknown) => theme as StorybookTheme;

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: 'story', label: 'Current Story' },
  { value: 'component', label: 'Component Tokens' },
  { value: 'all', label: 'All Tokens' },
];

const Wrapper = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column' as const,
  padding: '6px 12px',
}));

const ToolbarRow = styled(Bar)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const StyledSelect = styled(Form.Select)({
  width: 160,
  flexShrink: 0,
});

const TokenCount = styled.div(({ theme }) => ({
  padding: '4px 12px',
  fontSize: 11,
  lineHeight: '16px',
  minHeight: 24,
  color: t(theme).color.mediumdark,
}));

interface Props {
  query: string;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  filterMode: FilterMode;
  onFilterChange: (mode: FilterMode) => void;
  tokenCount: number;
  usedCount: number;
}

export const FilterToolbar: FC<Props> = ({
  query,
  onSearchChange,
  filterMode,
  onFilterChange,
  tokenCount,
  usedCount,
}) => {
  return (
    <Wrapper>
      <ToolbarRow>
        <Form.Input
          type="text"
          placeholder="Search tokens…"
          value={query}
          onChange={onSearchChange}
          aria-label="Search tokens"
          size="flex"
        />
        <Separator />
        <StyledSelect
          value={filterMode}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onFilterChange(e.target.value as FilterMode)}
          aria-label="Filter tokens"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </StyledSelect>
      </ToolbarRow>
      <TokenCount>
        {tokenCount} tokens &middot; {usedCount} used &middot; {tokenCount - usedCount} unused
      </TokenCount>
    </Wrapper>
  );
};
