//
// Copyright 2021 DXOS.org
//

import { ClientConfig } from '@dxos/client';

// TODO(burdon): Read from YML file.
export const ONLINE_CONFIG: ClientConfig = {
  swarm: {
    signal: ['wss://apollo1.kube.moon.dxos.network/dxos/signal']
  }
};