//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Stream } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  DataService,
  MutationReceipt,
  SubscribeEntitySetRequest,
  SubscribeEntitySetResponse,
  SubscribeEntityStreamRequest,
  SubscribeEntityStreamResponse,
  WriteRequest
} from '@dxos/protocols/proto/dxos/echo/service';
import { ComplexMap } from '@dxos/util';

import { SpaceNotFoundError } from '../errors';
import { DataServiceHost } from './data-service-host';

// TODO(burdon): Clear on close.
export class DataServiceSubscriptions {
  private readonly _spaces = new ComplexMap<PublicKey, DataServiceHost>(PublicKey.hash);

  clear() {
    this._spaces.clear();
  }

  registerSpace(spaceKey: PublicKey, host: DataServiceHost) {
    log('Registering space', { spaceKey });
    this._spaces.set(spaceKey, host);
  }

  unregisterSpace(spaceKey: PublicKey) {
    log('Unregistering space', { spaceKey });
    this._spaces.delete(spaceKey);
  }

  getDataService(spaceKey: PublicKey) {
    return this._spaces.get(spaceKey);
  }
}

/**
 * Routes DataService requests to different DataServiceHost instances based on space id.
 */
// TODO(burdon): Move to client-services.
export class DataServiceImpl implements DataService {
  constructor(private readonly _subscriptions: DataServiceSubscriptions) {}

  subscribeEntitySet(request: SubscribeEntitySetRequest): Stream<SubscribeEntitySetResponse> {
    assert(request.spaceKey);
    const host =
      this._subscriptions.getDataService(request.spaceKey) ?? raise(new SpaceNotFoundError(request.spaceKey));
    return host.subscribeEntitySet();
  }

  subscribeEntityStream(request: SubscribeEntityStreamRequest): Stream<SubscribeEntityStreamResponse> {
    assert(request.spaceKey);
    const host =
      this._subscriptions.getDataService(request.spaceKey) ?? raise(new SpaceNotFoundError(request.spaceKey));
    return host.subscribeEntityStream(request);
  }

  write(request: WriteRequest): Promise<MutationReceipt> {
    assert(request.spaceKey);
    assert(request.mutation);
    const host =
      this._subscriptions.getDataService(request.spaceKey) ?? raise(new SpaceNotFoundError(request.spaceKey));
    return host.write(request.mutation);
  }
}
