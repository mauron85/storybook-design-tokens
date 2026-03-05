import React from 'react';
import { styled } from 'storybook/theming';
import { Spinner } from './Spinner';

export const LoaderContainer = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  padding: 48,
  color: theme.color.mediumdark,
  fontSize: 13,
}));

export const Loader = () => (
  <LoaderContainer>
    <Spinner />
    <span>Loading tokens...</span>
  </LoaderContainer>
);
