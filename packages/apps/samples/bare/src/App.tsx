//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Config, Dynamics, Defaults } from '@dxos/config';
import { GenericFallback, ServiceWorkerToast, Fallback } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';

// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError: (err) => {
      console.error(err);
    }
  });
  return (
    <UiKitProvider appNs='@dxos/bare' fallback={<Fallback message='Loading...' />}>
      <ClientProvider config={config} fallback={<GenericFallback />}>
        {/* your components here */}
        {needRefresh ? (
          <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
        ) : offlineReady ? (
          <ServiceWorkerToast variant='offlineReady' />
        ) : null}
      </ClientProvider>
    </UiKitProvider>
  );
};
