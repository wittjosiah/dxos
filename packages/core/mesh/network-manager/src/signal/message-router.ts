//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { Answer, SwarmMessage } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { ComplexMap, MakeOptional } from '@dxos/util';

import { OfferMessage, SignalMessage, SignalMessenger } from './signal-messenger';

interface OfferRecord {
  resolve: (answer: Answer) => void;
  reject: (error?: Error) => void;
}

interface MessageRouterOptions {
  sendMessage: (params: { author: PublicKey; recipient: PublicKey; payload: Any }) => Promise<void>;
  onOffer: (message: OfferMessage) => Promise<Answer>;
  onSignal: (message: SignalMessage) => Promise<void>;
  topic: PublicKey;
}

/**
 * Adds offer/answer and signal interfaces.
 */
export class MessageRouter implements SignalMessenger {
  private readonly _onSignal: (message: SignalMessage) => Promise<void>;
  private readonly _sendMessage: (msg: { author: PublicKey; recipient: PublicKey; payload: Any }) => Promise<void>;

  private readonly _onOffer: (message: OfferMessage) => Promise<Answer>;
  private readonly _topic: PublicKey;

  private readonly _offerRecords: ComplexMap<PublicKey, OfferRecord> = new ComplexMap((key) => key.toHex());

  constructor({ sendMessage, onSignal, onOffer, topic }: MessageRouterOptions) {
    this._sendMessage = sendMessage;
    this._onSignal = onSignal;
    this._onOffer = onOffer;
    this._topic = topic;
  }

  async receiveMessage({
    author,
    recipient,
    payload
  }: {
    author: PublicKey;
    recipient: PublicKey;
    payload: Any;
  }): Promise<void> {
    if (payload.type_url !== 'dxos.mesh.swarm.SwarmMessage') {
      // Ignore not swarm messages.
      return;
    }
    const message: SwarmMessage = schema.getCodecForType('dxos.mesh.swarm.SwarmMessage').decode(payload.value);

    if (!this._topic.equals(message.topic)) {
      // Ignore messages from wrong topics.
      return;
    }

    log('received', { from: author, to: recipient, msg: message });

    if (message.data?.offer) {
      await this._handleOffer({ author, recipient, message });
    } else if (message.data?.answer) {
      await this._resolveAnswers(message);
    } else if (message.data?.signal) {
      await this._handleSignal({ author, recipient, message });
    }
  }

  async signal(message: SignalMessage): Promise<void> {
    assert(message.data?.signal);
    await this._sendReliableMessage({
      author: message.author,
      recipient: message.recipient,
      message
    });
  }

  async offer(message: OfferMessage): Promise<Answer> {
    const networkMessage: SwarmMessage = {
      ...message,
      messageId: PublicKey.random()
    };
    return new Promise<Answer>((resolve, reject) => {
      this._offerRecords.set(networkMessage.messageId!, { resolve, reject });
      return this._sendReliableMessage({
        author: message.author,
        recipient: message.recipient,
        message: networkMessage
      });
    });
  }

  private async _sendReliableMessage({
    author,
    recipient,
    message
  }: {
    author: PublicKey;
    recipient: PublicKey;
    message: MakeOptional<SwarmMessage, 'messageId'>;
  }): Promise<void> {
    const networkMessage: SwarmMessage = {
      ...message,
      // Setting unique message_id if it not specified yet.
      messageId: message.messageId ?? PublicKey.random()
    };

    log('sending', { from: author, to: recipient, msg: networkMessage });
    await this._encodeAndSend({ author, recipient, message: networkMessage });
  }

  private async _encodeAndSend({
    author,
    recipient,
    message
  }: {
    author: PublicKey;
    recipient: PublicKey;
    message: SwarmMessage;
  }) {
    await this._sendMessage({
      author,
      recipient,
      payload: {
        type_url: 'dxos.mesh.swarm.SwarmMessage',
        value: schema.getCodecForType('dxos.mesh.swarm.SwarmMessage').encode(message)
      }
    });
  }

  private async _resolveAnswers(message: SwarmMessage): Promise<void> {
    assert(message.data?.answer?.offerMessageId, 'No offerMessageId');
    const offerRecord = this._offerRecords.get(message.data.answer.offerMessageId);
    if (offerRecord) {
      this._offerRecords.delete(message.data.answer.offerMessageId);
      assert(message.data?.answer, 'No answer');
      log('resolving', { answer: message.data.answer });
      offerRecord.resolve(message.data.answer);
    }
  }

  private async _handleOffer({
    author,
    recipient,
    message
  }: {
    author: PublicKey;
    recipient: PublicKey;
    message: SwarmMessage;
  }): Promise<void> {
    assert(message.data.offer, 'No offer');
    const offerMessage: OfferMessage = {
      author,
      recipient,
      ...message,
      data: { offer: message.data.offer }
    };
    const answer = await this._onOffer(offerMessage);
    answer.offerMessageId = message.messageId;
    await this._sendReliableMessage({
      author: recipient,
      recipient: author,
      message: {
        topic: message.topic,
        sessionId: message.sessionId,
        data: { answer }
      }
    });
  }

  private async _handleSignal({
    author,
    recipient,
    message
  }: {
    author: PublicKey;
    recipient: PublicKey;
    message: SwarmMessage;
  }): Promise<void> {
    assert(message.messageId);
    assert(message.data.signal, 'No Signal');
    const signalMessage: SignalMessage = {
      author,
      recipient,
      ...message,
      data: { signal: message.data.signal }
    };

    await this._onSignal(signalMessage);
  }
}
