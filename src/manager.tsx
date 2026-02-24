import React, { useEffect, useState } from 'react';
import { AddonPanel } from 'storybook/internal/components';
import { addons, types, useStorybookApi } from 'storybook/internal/manager-api';
import { DesignTokensPanel } from './components/DesignTokensPanel';
import { ADDON_ID, EVENTS, PANEL_ID, PANEL_TITLE } from './constants';
import type { StoryTokenPayload } from './types';

function PanelContainer({ active }: { active: boolean }) {
  const api = useStorybookApi();
  const [tokensByStory, setTokensByStory] = useState<Record<string, StoryTokenPayload>>({});

  useEffect(() => {
    const channel = addons.getChannel();
    const onUpdate = (payload: StoryTokenPayload) => {
      setTokensByStory((prev) => ({ ...prev, [payload.storyId]: payload }));
    };

    channel.on(EVENTS.UPDATE, onUpdate);
    return () => channel.off(EVENTS.UPDATE, onUpdate);
  }, []);

  const currentStoryData = api.getCurrentStoryData();
  const payload = currentStoryData ? tokensByStory[currentStoryData.id] : undefined;

  return (
    <AddonPanel active={active}>
      <DesignTokensPanel
        allTokens={payload?.allTokens ?? []}
        usedTokenNames={payload?.usedTokenNames ?? []}
        showUnusedByDefault={Boolean(currentStoryData?.parameters?.designTokens?.showUnusedByDefault)}
      />
    </AddonPanel>
  );
}

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: PANEL_TITLE,
    render: PanelContainer
  });
});
