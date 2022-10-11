//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import expect from 'expect';
import defaultHypercore from 'hypercore';
import assert from 'node:assert';
import pify from 'pify';
import tempy from 'tempy';

import { createKeyPair } from '@dxos/crypto';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import FeedDescriptor from './feed-descriptor';

describe('FeedDescriptor', function () {
  let fd: FeedDescriptor;

  beforeEach(async function () {
    const keyring = new Keyring();
    fd = new FeedDescriptor({
      directory: createStorage({ type: StorageType.RAM }).createDirectory('feed'),
      key: await keyring.createKey(),
      hypercore: defaultHypercore,
      signer: keyring
    });
  });

  afterEach(async function () {
    await fd.close();
  });

  it('Create', function () {
    expect(fd).toBeInstanceOf(FeedDescriptor);
    expect(fd.key).toBeDefined();
  });

  it('Can create feed descriptor with public key but without private key', async function () {
    // When this behaviour was changed, suddenly `protocol-plugin-replicator` tests started hanging forever on network generation.
    const { publicKey } = createKeyPair();
    const key = PublicKey.from(publicKey);
    const fd = new FeedDescriptor({
      key,
      directory: createStorage({ type: StorageType.NODE }).createDirectory('feed'),
      hypercore: defaultHypercore
    });
    expect(fd.key).toEqual(key);
    expect(fd.secretKey).toBeUndefined();
  });

  it('Create custom options', function () {
    const { publicKey, secretKey } = createKeyPair();

    const fd = new FeedDescriptor({
      directory: createStorage({ type: StorageType.RAM }).createDirectory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      valueEncoding: 'json',
      hypercore: defaultHypercore
    });

    expect(fd).toBeInstanceOf(FeedDescriptor);
    expect(fd.key).toBeInstanceOf(PublicKey);
    expect(fd.secretKey).toBeInstanceOf(Buffer);
    expect(fd.valueEncoding).toBe('json');
  });

  it('Open', async function () {
    expect(fd.opened).toBe(false);

    // Opening multiple times should actually open once.
    const [feed1, feed2] = await Promise.all([fd.open(), fd.open()]);
    expect(feed1).toBe(feed2);

    assert(fd.feed);

    expect(fd.feed).toBe(feed1);
    expect(fd.feed.key).toBeInstanceOf(Buffer);
    expect(fd.opened).toBe(true);
  });

  it('Close', async function () {
    await fd.open();
    // Closing multiple times should actually close once.
    await Promise.all([fd.close(), fd.close()]);
    expect(fd.opened).toBe(false);

    assert(fd.feed);

    fd.feed.append('test', (err: any) => {
      expect(err.message).toContain('This feed is not writable');
    });

    // If we try to close a feed that is opening should wait for the open result.
    const { publicKey, secretKey } = createKeyPair();
    const fd2 = new FeedDescriptor({
      directory: createStorage({ type: StorageType.RAM }).createDirectory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      hypercore: defaultHypercore
    });

    await fd2.open();
    await expect(fd2.close()).resolves.toBeUndefined();
    expect(fd.opened).toBe(false);
  });

  it.skip('Close and open again', async function () {
    const root = tempy.directory();

    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage({ type: StorageType.NODE, root }).createDirectory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      valueEncoding: 'utf-8',
      hypercore: defaultHypercore
    });

    await fd.open();
    expect(fd.opened).toBe(true);

    assert(fd.feed);

    await pify(fd.feed.append.bind(fd.feed))('test');

    await fd.close();
    expect(fd.opened).toBe(false);

    await fd.open();
    expect(fd.opened).toBe(true);

    const msg = await pify(fd.feed.head.bind(fd.feed))();
    expect(msg).toBe('test');
  });

  it('on open error should unlock the resource', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage({ type: StorageType.RAM }).createDirectory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      hypercore: () => {
        throw new Error('open error');
      }
    });

    await expect(fd.open()).rejects.toThrow(/open error/);
  });

  it.skip('on close error should unlock the resource', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage({ type: StorageType.RAM }).createDirectory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      hypercore: () => ({
        opened: true,
        on: () => {},
        ready: (cb: () => void) => {
          cb();
        },
        close: () => {
          throw new Error('close error');
        }
      } as any)
    });

    await fd.open();

    await expect(fd.close()).rejects.toThrow(/close error/);
  });
});