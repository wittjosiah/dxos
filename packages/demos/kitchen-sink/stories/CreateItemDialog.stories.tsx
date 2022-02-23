//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { FullScreen } from '@dxos/react-components';

import { CreateItemDialog, TestType } from '../src';
import { CreateItemButton, itemAdapter } from './helpers';

export default {
  title: 'KitchenSink/CreateItemDialog'
};

export const Primary = () => {
  return (
    <FullScreen>
      <CreateItemDialog
        open
        type={TestType.Org}
        itemAdapter={itemAdapter}
        onCreate={(title: string) => console.log(title)}
        onCancel={() => {}}
      />
    </FullScreen>
  );
};

export const Secondary = () => {
  const handleCreate = (type?: string, title?: string) => {
    console.log(type, title);
  };

  return (
    <FullScreen>
      <CreateItemButton
        onCreate={(type?: string, title?: string) => handleCreate(type, title)}
      />
    </FullScreen>
  );
};