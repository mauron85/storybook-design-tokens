import React, { useEffect, useState } from 'react';
import { addons, types } from 'storybook/manager-api';
import { DesignTokensPanel } from './components/DesignTokensPanel.js';
import { ADDON_ID, EVENTS, PANEL_ID, PANEL_TITLE } from './constants.js';
import type { StoryTokenPayload } from './types.js';

// Panel container with channel communication
function PanelContainer({ active }: Readonly<{ active?: boolean }>) {
  const [tokensByStory, setTokensByStory] = useState<Record<string, StoryTokenPayload>>({});
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [channel] = useState(() => addons.getChannel());

  useEffect(() => {
    const onUpdate = (payload: StoryTokenPayload) => {
      setTokensByStory((prev) => ({ ...prev, [payload.storyId]: payload }));
      setCurrentStoryId(payload.storyId);
    };

    channel.on(EVENTS.UPDATE, onUpdate);
    return () => {
      channel.off(EVENTS.UPDATE, onUpdate);
    };
  }, [channel]);

  if (!active) return null;

  const payload = currentStoryId ? tokensByStory[currentStoryId] : undefined;

  return (
    <DesignTokensPanel
      allTokens={payload?.allTokens ?? []}
      usedTokenNames={payload?.usedTokenNames ?? []}
      showUnusedByDefault={false}
      channel={channel}
    />
  );
}

// Register addon
addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: PANEL_TITLE,
    render: ({ active }) => <PanelContainer active={active} />,
  });
});
