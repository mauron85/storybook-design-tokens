import React, { useEffect, useState } from 'react';
import { AddonPanel } from '@storybook/components';
import { addons, types, useStorybookApi } from '@storybook/manager-api';
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

  const currentStoryId = api.getCurrentStoryData()?.id;
  const params = api.getCurrentStoryData()?.parameters?.designTokens ?? {};
  const payload = currentStoryId ? tokensByStory[currentStoryId] : undefined;

  return (
    <AddonPanel active={active}>
      <DesignTokensPanel
        allTokens={payload?.allTokens ?? []}
        usedTokenNames={payload?.usedTokenNames ?? []}
        showUnusedByDefault={Boolean(params.showUnusedByDefault)}
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
