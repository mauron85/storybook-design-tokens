import React from 'react';
import { addons, types } from 'storybook/manager-api';
import { ADDON_ID, PANEL_ID, PANEL_TITLE } from './constants.js';
import { Panel } from './components/Panel.js';

// Register addon
addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: PANEL_TITLE,
    render: ({ active }) => <Panel active={active} />,
  });
});
