//
// Copyright 2020 DXOS.org
//

import { MessengerModel } from '@dxos/messenger-model';

import { Agent, BROWSER_ENV, /* NODE_ENV, */ Orchestrator } from '../src';
import { APPEND_COMMAND, GET_ALL_COMMAND } from '../src/agents/test-agent';

jest.setTimeout(100_000);

test.skip('multiple agents', async () => {
  const numAgents = 5;
  const numMessages = 10;

  const orchestrator = await Orchestrator.create({ local: true });
  orchestrator.client.registerModel(MessengerModel);
  await orchestrator.start();

  await orchestrator.party.database.createItem({ model: MessengerModel, type: 'dxos.org/type/testing/object' });

  const agents: Agent[] = [];
  for (let i = 0; i < numAgents; i++) {
    agents.push(await orchestrator.startAgent({ botPath: './src/test-agent.js', env: BROWSER_ENV }));
  }

  await Promise.all(agents.map(async agent => {
    for (let i = 0; i < numMessages; i++) {
      await agent.sendCommand({ type: APPEND_COMMAND });
    }
  }));

  await Promise.all(agents.map(agent => new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(async () => {
      try {
        const messages = await agent.sendCommand({ type: GET_ALL_COMMAND });
        if (messages.length === numAgents * numMessages) {
          clearTimeout(timeoutId);
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    }, 1000);
  })));

  await orchestrator.destroy();
});