//
// Copyright 2019 DXOS.org
//

import debug from 'debug';
import pump from 'pump';

import { keyToString, randomBytes, PublicKey, PublicKeyLike } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';
import { trigger } from '@dxos/util';

import { Keyring } from '../keys';
import { createKeyAdmitMessage } from '../party';
import { Command, KeyType, Message } from '../proto';
import { Greeter } from './greeter';
import { GreetingCommandPlugin } from './greeting-command-plugin';
import { SecretProvider, SecretValidator } from './invitation';

const log = debug('dxos:creds:greet');

/**
 * Create the Greeter with Plugin and Protocol.
 */
const createGreeter = async (targetPartyKey: PublicKeyLike) => {
  const [writePromise, outerResolve] = trigger<Message[]>();

  const hints = [
    { publicKey: PublicKey.from(randomBytes(32)), type: KeyType.IDENTITY },
    { publicKey: PublicKey.from(randomBytes(32)), type: KeyType.DEVICE },
    { publicKey: PublicKey.from(randomBytes(32)), type: KeyType.FEED },
    { publicKey: PublicKey.from(randomBytes(32)), type: KeyType.FEED }
  ];

  const greeter = new Greeter(
    targetPartyKey,
    async messages => {
      outerResolve(messages);
      return messages;
    },
    async () => hints
  );

  const peerId = randomBytes(32);
  const plugin = new GreetingCommandPlugin(peerId, greeter.createMessageHandler());

  const protocol = new Protocol({
    streamOptions: {
      live: true
    }
  })
    .setSession({ peerId })
    .setExtension(plugin.createExtension())
    .init(peerId);

  return { greeter, rendezvousKey: peerId, plugin, protocol, writePromise: writePromise(), hints };
};

/**
 * Create the Invitee with Plugin and Protocol.
 */
const createInvitee = async (rendezvousKey: Buffer, invitationId: Buffer) => {
  const peerId = invitationId;

  const invitee = new Greeter();
  const plugin = new GreetingCommandPlugin(peerId, invitee.createMessageHandler());

  const connectionPromise = new Promise<void>(resolve => {
    plugin.on('peer:joined', (peerId) => {
      if (peerId && keyToString(peerId) === keyToString(rendezvousKey)) {
        log(`${keyToString(peerId)} connected.`);
        resolve();
      }
    });
  });

  const protocol = new Protocol({
    streamOptions: {
      live: true
    }
  })
    .setSession({ peerId })
    .setExtension(plugin.createExtension())
    .init(rendezvousKey);

  // TODO(burdon): Bad return object (too many things).
  return { protocol, invitee, plugin, peerId, connectionPromise };
};

/**
 * Connect two Protocols together.
 */
const connect = (source: Protocol, target: Protocol) => {
  return pump(source.stream, target.stream, source.stream);
};

test('Greeting Flow using GreetingCommandPlugin', async () => {
  const targetPartyKey = PublicKey.from(randomBytes(32));
  const secret = '0000';

  const secretProvider: SecretProvider = async () => Buffer.from(secret);
  const secretValidator: SecretValidator = async (invitation, secret) => !!secret && !!invitation.secret && secret.equals(invitation.secret);

  const {
    protocol: greeterProtocol, greeter, rendezvousKey, hints, writePromise
  } = await createGreeter(targetPartyKey);

  const invitation = await greeter.createInvitation(targetPartyKey, secretValidator, secretProvider);

  const {
    protocol: inviteeProtocol, plugin, connectionPromise
  } = await createInvitee(rendezvousKey, invitation.id);

  connect(greeterProtocol, inviteeProtocol);

  await connectionPromise;

  // Present the invitation (by showing up).
  {
    const command = {
      __type_url: 'dxos.credentials.greet.Command',
      command: Command.Type.BEGIN
    };

    await plugin.send(rendezvousKey, command);
  }

  // Obtain the nonce and partyKey from the HANDSHAKE response.
  const { nonce, partyKey } = await (async () => {
    const command = {
      __type_url: 'dxos.credentials.greet.Command',
      command: Command.Type.HANDSHAKE,
      secret: await secretProvider({}),
      params: []
    };

    const { nonce, partyKey } = await plugin.send(rendezvousKey, command);
    return { nonce, partyKey };
  })();

  // Create a signed credential and submit it to the Greeter for "writing" (see writePromise).
  {
    const keyring = new Keyring();
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });

    const command = {
      __type_url: 'dxos.credentials.greet.Command',
      command: Command.Type.NOTARIZE,
      secret: await secretProvider({}),
      params: [
        createKeyAdmitMessage(keyring,
          partyKey,
          identityKey,
          [identityKey],
          nonce)
      ]
    };

    // Send them to the greeter.
    const notarizeResponse = await plugin.send(rendezvousKey, command);
    expect(notarizeResponse.hints).toEqual(hints);

    // In the real world, the response would be signed in an envelope by the Greeter, but in this test it is not altered.
    const written = await writePromise;
    expect(written.length).toBe(1);
    expect(written[0].payload.signatures).toEqual(command.params[0].payload.signatures);
  }

  await plugin.send(rendezvousKey, {
    __type_url: 'dxos.credentials.greet.Command',
    command: Command.Type.FINISH,
    secret: await secretProvider({})
  });
});