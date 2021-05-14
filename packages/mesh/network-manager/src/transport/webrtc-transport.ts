//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';
import wrtc from 'wrtc';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { ErrorStream } from '@dxos/debug';
import { Protocol } from '@dxos/protocol';

import { SignalApi } from '../signal';
import { Transport, TransportFactory } from './transport';

const log = debug('dxos:network-manager:swarm:transport:webrtc');

/**
 * Wrapper around simple-peer. Tracks peer state.
 */
export class WebrtcTransport implements Transport {
  private _peer: SimplePeer;

  readonly closed = new Event();

  readonly connected = new Event();

  readonly errors = new ErrorStream();

  constructor (
    private readonly _initiator: boolean,
    private readonly _protocol: Protocol,
    private readonly _ownId: PublicKey,
    private readonly _remoteId: PublicKey,
    private readonly _sessionId: PublicKey,
    private readonly _topic: PublicKey,
    private readonly _sendSignal: (msg: SignalApi.SignalMessage) => Promise<void>,
    private readonly _webrtcConfig?: any
  ) {
    log(`Created WebRTC connection ${this._ownId} -> ${this._remoteId} initiator=${this._initiator}`);

    log(`Creating webrtc connection topic=${this._topic} ownId=${this._ownId} remoteId=${this._remoteId} initiator=${this._initiator} webrtcConfig=${JSON.stringify(this._webrtcConfig)}`);
    this._peer = new SimplePeerConstructor({
      initiator: this._initiator,
      wrtc: SimplePeerConstructor.WEBRTC_SUPPORT ? undefined : wrtc,
      config: this._webrtcConfig
    });
    this._peer.on('signal', async data => {
      try {
        await this._sendSignal({
          id: this._ownId,
          remoteId: this._remoteId,
          sessionId: this._sessionId,
          topic: this._topic,
          data
        });
      } catch (err) {
        this.errors.raise(err);
      }
    });
    this._peer.on('connect', () => {
      log(`Connection established ${this._ownId} -> ${this._remoteId}`);

      const stream = this._protocol.stream as NodeJS.ReadWriteStream;
      stream.pipe(this._peer!).pipe(stream);

      this.connected.emit();
    });
    this._peer.on('error', err => this.errors.raise(err));
    this._peer.on('close', () => {
      log(`Connection closed ${this._ownId} -> ${this._remoteId}`);
      this._closeStream();
      this.closed.emit();
    });
  }

  get remoteId () {
    return this._remoteId;
  }

  get sessionId () {
    return this._sessionId;
  }

  get peer () {
    return this._peer;
  }

  signal (msg: SignalApi.SignalMessage) {
    assert(this._peer, 'Connection not ready to accept signals.');
    this._peer.signal(msg.data);
  }

  async close () {
    await this._closeStream();
    this._peer!.destroy();
    log('Closed.');
  }

  private async _closeStream () {
    await this._protocol.close();

    const stream = this._protocol.stream as NodeJS.ReadWriteStream;
    stream.unpipe(this._peer).unpipe(stream);
  }
}

export function createWebRtcTransportFactory (webrtcConfig?: any): TransportFactory {
  return opts => new WebrtcTransport(
    opts.initiator,
    opts.protocol,
    opts.ownId,
    opts.remoteId,
    opts.sessionId,
    opts.topic,
    opts.sendSignal,
    webrtcConfig
  );
}