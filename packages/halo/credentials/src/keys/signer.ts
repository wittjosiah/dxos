//
// Copyright 2021 DXOS.org
//

import { KeyChain, KeyRecord, SignedMessage, WithTypeUrl } from '../proto';

export interface Signer {
  /**
   * Sign the message with the indicated key or keys. The returned signed object will be of the form:
   * {
   *   signed: { ... }, // The message as signed, including timestamp and nonce.
   *   signatures: []   // An array with signature and publicKey of each signing key.
   * }
   */
  sign (message: any, keys: (KeyRecord | KeyChain)[], nonce?: Buffer, created?: string): WithTypeUrl<SignedMessage>;

  /**
   * Sign the data with the indicated key and return the signature.
   * KeyChains are not supported.
   */
  rawSign (data: Buffer, keyRecord: KeyRecord): Buffer;
}