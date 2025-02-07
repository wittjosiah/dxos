//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import assert from 'node:assert';

import { CredentialGenerator } from '@dxos/credentials';
import { ObjectModel } from '@dxos/object-model';
import { AdmittedFeed } from '@dxos/protocols/proto/dxos/halo/credentials';
import { describe, test, afterTest } from '@dxos/test';

import { TestAgentBuilder } from '../testing';

// TODO(burdon): Factor out?
const run = <T>(cb: () => Promise<T>): Promise<T> => cb();

describe('space/space', () => {
  test('crates a database with object model', async () => {
    const builder = new TestAgentBuilder();
    afterTest(async () => await builder.close());
    const agent = await builder.createPeer();
    const [space, db] = await agent.createSpace();

    await space.open();
    expect(space.isOpen).toBeTruthy();
    afterTest(() => space.close());

    {
      // Genesis
      const generator = new CredentialGenerator(agent.keyring, agent.identityKey, agent.deviceKey);
      const credentials = [
        ...(await generator.createSpaceGenesis(space.key, space.controlFeedKey)),
        await generator.createFeedAdmission(space.key, space.dataFeedKey, AdmittedFeed.Designation.DATA)
      ];

      for (const credential of credentials) {
        await space.controlPipeline.writer.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }

      // TODO(burdon): Debugging only.
      await space.controlPipeline.state!.waitUntilTimeframe(space.controlPipeline.state!.endTimeframe);
    }

    {
      assert(db.database);
      const item1 = await db.database.createItem<ObjectModel>({
        type: 'dxos.example'
      });
      const item2 = await db.database.createItem<ObjectModel>({
        type: 'dxos.example'
      });

      await item1.model.set('key_1', 'value_1');
      await item2.model.set('key_2', 'value_2');

      expect(item1.model.get('key_1')).toEqual('value_1');
      expect(item2.model.get('key_2')).toEqual('value_2');

      expect(db.database.select({ type: 'dxos.example' }).exec().entities).toHaveLength(2);
    }

    await builder.close();
    expect(space.isOpen).toBeFalsy();
  });

  test('two spaces replicating', async () => {
    const builder = new TestAgentBuilder();
    afterTest(async () => await builder.close());

    //
    // Agent 1
    //
    const [agent1, space1, db1] = await run(async () => {
      const agent = await builder.createPeer();
      const [space, db] = await agent.createSpace(agent.identityKey);

      await space.open();
      expect(space.isOpen).toBeTruthy();
      afterTest(() => space.close());

      {
        // Genesis
        const generator = new CredentialGenerator(agent.keyring, agent.identityKey, agent.deviceKey);
        const credentials = [
          ...(await generator.createSpaceGenesis(space.key, space.controlFeedKey)),
          await generator.createFeedAdmission(space.key, space.dataFeedKey, AdmittedFeed.Designation.DATA)
        ];

        for (const credential of credentials) {
          await space.controlPipeline.writer.write({
            '@type': 'dxos.echo.feed.CredentialsMessage',
            credential
          });
        }

        await space.controlPipeline.state!.waitUntilTimeframe(space.controlPipeline.state!.endTimeframe);
      }

      return [agent, space, db];
    });

    //
    // Agent 2
    //
    const [agent2, space2, db2] = await run(async () => {
      // NOTE: The genesisKey would be passed as part of the invitation.
      const agent = await builder.createPeer();
      const [space, db] = await agent.createSpace(agent.identityKey, space1.key, space1.genesisFeedKey);

      await space.open();
      expect(space.isOpen).toBeTruthy();
      afterTest(() => space.close());

      return [agent, space, db];
    });

    expect(agent1).toBeDefined();
    expect(agent2).toBeDefined();

    {
      // Write invitation from agent 1.
      const generator = new CredentialGenerator(agent1.keyring, agent1.identityKey, agent1.deviceKey);
      const credentials = await generator.createMemberInvitation(
        space1.key,
        agent2.identityKey,
        agent2.deviceKey,
        space2.controlFeedKey,
        space2.dataFeedKey,
        space1.genesisFeedKey
      );

      for (const credential of credentials) {
        await space1.controlPipeline.writer.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
    }

    {
      // Initial data exchange.

      // Agent 1 reads all feed messages.
      await space1.controlPipeline.state!.waitUntilTimeframe(space1.controlPipeline.state!.endTimeframe);

      // Agent 2 reads all feed messages.
      await space2.controlPipeline.state!.waitUntilTimeframe(space1.controlPipeline.state!.endTimeframe);
    }

    // TODO(burdon): Write multiple items (extract for all tests).

    {
      // Check item replicated from 1 => 2.
      const item1 = await db1.database!.createItem({
        type: 'dxos.example.1'
      });
      const item2 = await db2.database!.waitForItem({
        type: 'dxos.example.1'
      });
      expect(item1.id).toEqual(item2.id);
    }

    {
      // Check item replicated from 2 => 1.
      const item1 = await db2.database!.createItem({
        type: 'dxos.example.2'
      });
      const item2 = await db1.database!.waitForItem({
        type: 'dxos.example.2'
      });
      expect(item1.id).toEqual(item2.id);
    }

    await builder.close();
    expect(space1.isOpen).toBeFalsy();
    expect(space2.isOpen).toBeFalsy();
  });
});
