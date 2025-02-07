//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useDevtools, useStream } from '@dxos/react-client';

import { SpaceTable } from '../../components';

export const SpacesPanel = () => {
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }

  const { spaces } = useStream(() => devtoolsHost.subscribeToSpaces({}), {});
  if (spaces === undefined) {
    return null;
  }

  return <SpaceTable spaces={spaces} />;
};
