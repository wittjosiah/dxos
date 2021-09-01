//
// Copyright 2021 DXOS.org
//

import Moleculer from 'moleculer';

import { PublicKey } from '@dxos/crypto';

import { createBroker } from './broker';

/**
 * Creates a test instance of the signal server with swarming disabled and starts it.
 *
 * @param port Port to start the signal server on, random by default.
 */
export async function createTestBroker (port?: string | number): Promise<Moleculer.ServiceBroker> {
  const broker = createBroker(PublicKey.random().asBuffer(), {
    port,
    logger: false,
    logLevel: 'fatal',
    hyperswarm: { bootstrap: false }
  });
  await broker.start();
  return broker;
}