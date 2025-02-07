//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';

import { Client, fromHost } from '@dxos/client';
import { Config, Defaults } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { OptionsContext } from '../hooks';
import { InitPage, SettingsPage, JoinPage, SpacePage } from './pages';

/**
 * Main app routes.
 */
const Routes = () => {
  return useRoutes([
    {
      path: '/',
      element: <InitPage />
    },
    {
      path: '/settings',
      element: <SettingsPage />
    },
    {
      path: '/join/:invitation',
      element: <JoinPage />
    },
    {
      path: '/:spaceKey',
      element: <SpacePage />,
      children: [
        {
          path: '/:spaceKey/:view',
          element: <SpacePage />
        }
      ]
    }
  ]);
};

/**
 * Main app container with routes.
 */
export const App: FC<{ debug?: boolean }> = ({ debug = false }) => {
  const [client, setClient] = useState<Client | undefined>(undefined);

  // Auto-create client and profile.
  useEffect(() => {
    setTimeout(async () => {
      const config = new Config(Defaults());
      const client = new Client({
        config,
        services: fromHost(config)
      });

      await client.initialize();
      // TODO(burdon): Hangs (no error) if profile not created?
      if (!client.halo.profile) {
        await client.halo.createProfile();
      }

      setClient(client);
    });
  }, []);

  if (!client) {
    return null;
  }

  // TODO(burdon): Error boundary and indicator.

  return (
    <ClientProvider client={client}>
      <OptionsContext.Provider value={{ debug }}>
        <HashRouter>
          <Routes />
        </HashRouter>
      </OptionsContext.Provider>
    </ClientProvider>
  );
};
