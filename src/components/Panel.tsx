import React, { memo, Suspense, useState, useEffect, useCallback, type FC } from 'react';
import type { AddonParams, ParsedToken } from 'src/types';
import { AddonPanel } from 'storybook/internal/components';
import { addons, useParameter } from 'storybook/manager-api';
import { useStorybookApi } from 'storybook/manager-api';
import { EVENTS, PARAMETER_KEY } from '../constants';
import { SkeletonTable } from './SkeletonTable';
import { DesignTokens } from './DesignTokens';
import type { ElementInfo } from './DesignTokensTable';

interface PanelProps {
  active?: boolean;
}

export const Panel: FC<PanelProps> = memo(function DesignTokensPanel(props: PanelProps) {
  const api = useStorybookApi();
  const params = useParameter<AddonParams>(PARAMETER_KEY, {});
  const storyData = api.getCurrentStoryData();
  const [channel] = useState(() => addons.getChannel());
  const [elementInfoMap, setElementInfoMap] = useState<Map<string, ElementInfo>>(new Map());

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

  // Reset element info when story changes
  useEffect(() => {
    setElementInfoMap(new Map());
  }, [storyData?.id]);

  const handleHighlight = useCallback(
    (token: ParsedToken) => {
      const tokenValue = token.primitiveValue ?? token.value;
      channel.emit(EVENTS.HIGHLIGHT, {
        tokenName: token.name,
        tokenValue,
        selectors: token.classNames,
      });
    },
    [channel],
  );

  const handleClearHighlight = useCallback(() => {
    channel.emit(EVENTS.CLEAR_HIGHLIGHT);
  }, [channel]);

  // Show skeleton immediately if story data or theme config hasn't loaded yet
  // to avoid a flash of empty content before Suspense can kick in.
  // useParameter initially returns the default ({}) before the real params arrive,
  // so themeCssPath is briefly undefined — rendering DesignTokens in that state
  // would produce an empty table flash.
  if (!storyData?.importPath || !params.themeCssPath) {
    return (
      <AddonPanel active={props.active ?? false} hasScrollbar={false}>
        <SkeletonTable />
      </AddonPanel>
    );
  }

  return (
    <AddonPanel active={props.active ?? false} hasScrollbar={false}>
      <Suspense fallback={<SkeletonTable />}>
        <DesignTokens
          storyPath={storyData.importPath}
          themeCssPath={params.themeCssPath}
          elementInfoMap={elementInfoMap}
          onHighlight={handleHighlight}
          onClearHighlight={handleClearHighlight}
        />
      </Suspense>
    </AddonPanel>
  );
});
