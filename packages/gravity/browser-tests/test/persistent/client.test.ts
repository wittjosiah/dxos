//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import 'source-map-support/register';

import { Client } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';

describe('Client - persistent', () => {
  it('reset storage', async function () {
    if (browserMocha.context.browser !== 'firefox') {
      this.skip();
    }

    const client = new Client({ storage: { persistent: true } });
    await client.initialize(); // TODO(marik-d): This line does not work.
    await client.halo.createProfile({
      ...createKeyPair(),
      username: 'Reset test 1'
    });

    expect(client.echo.queryParties().value.length).toBe(0);
    await client.echo.createParty();
    expect(client.echo.queryParties().value.length).toBe(1);

    await client.reset();

    // We create another client instance after reset here because the first one becomes unusable.
    // In a browser this would be modeled as a page reload.
    // TODO(marik-d): Second client fails to initialize.
    // const client2 = new Client({ storage: { persistent: true } });

    // await client2.initialize();
    // await client2.halo.createProfile({
    //   ...createKeyPair(),
    //   username: 'Reset test 2'
    // });
    // expect(client2.echo.queryParties().value.length).toBe(0);
  }).timeout(10_000).retries(2);
});