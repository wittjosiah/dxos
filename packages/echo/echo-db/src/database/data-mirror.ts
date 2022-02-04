//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/crypto';
import { failUndefined } from '@dxos/debug';
import { DataService } from '@dxos/echo-protocol';
import { Model } from '@dxos/model-factory';

import { Entity } from './entity';
import { ItemManager } from './item-manager';

const log = debug('dxos:echo:items:data-mirror');

// TODO(dmaretskyi): Subscription cleanup.

/**
 * Maintains subscriptions via DataService to create a local copy of the entities (items and links) in the database.
 *
 * Entities are updated using snapshots and mutations sourced from the DataService.
 * Entity and model mutations are forwarded to the DataService.
 * This class is analogous to ItemDemuxer but for databases running in remote mode.
 */
export class DataMirror {
  constructor (
    private readonly _itemManager: ItemManager,
    private readonly _dataService: DataService,
    private readonly _partyKey: PublicKey
  ) {}

  open () {
    const entities = this._dataService.SubscribeEntitySet({ partyKey: this._partyKey });
    entities.subscribe(
      async diff => {
        for (const addedEntity of diff.added ?? []) {
          log(`Construct: ${JSON.stringify(addedEntity)}`);

          assert(addedEntity.itemId);
          assert(addedEntity.genesis);
          assert(addedEntity.genesis.modelType);

          let entity: Entity<Model<any>>;
          if (addedEntity.genesis.link) {
            assert(addedEntity.genesis.link.source);
            assert(addedEntity.genesis.link.target);

            entity = await this._itemManager.constructLink({
              itemId: addedEntity.itemId,
              itemType: addedEntity.genesis.itemType,
              modelType: addedEntity.genesis.modelType,
              source: addedEntity.genesis.link.source,
              target: addedEntity.genesis.link.target
            });
          } else {
            entity = await this._itemManager.constructItem({
              itemId: addedEntity.itemId,
              itemType: addedEntity.genesis.itemType,
              modelType: addedEntity.genesis.modelType,
              parentId: addedEntity.itemMutation?.parentId
            });
          }

          this._subscribeToUpdates(entity);
        }
      },
      err => {
        log(`Connection closed: ${err}`);
      }
    );
  }

  private _subscribeToUpdates (entity: Entity<Model<any>>) {
    const stream = this._dataService.SubscribeEntityStream({ partyKey: this._partyKey, itemId: entity.id });
    stream.subscribe(
      async update => {
        log(`Update[${entity.id}]: ${JSON.stringify(update)}`);
        if (update.snapshot) {
          assert(update.snapshot.model);
          if (update.snapshot.model.custom) {
            assert(entity.modelMeta.snapshotCodec);
            await entity.model.restoreFromSnapshot(entity.modelMeta.snapshotCodec.decode(update.snapshot.model?.custom));
          } else {
            assert(update.snapshot.model.array);
            for (const message of update.snapshot.model.array.mutations ?? []) {
              await entity.model.processMessage(message.meta, entity.modelMeta.mutation.decode(message.mutation));
            }
          }
        } else if (update.mutation) {
          if (update.mutation.data?.mutation) {
            assert(update.mutation.meta);
            await entity.model.processMessage({
              feedKey: (update.mutation.meta.feedKey ?? failUndefined()).asUint8Array(),
              memberKey: (update.mutation.meta.memberKey ?? failUndefined()).asUint8Array(),
              seq: update.mutation.meta.seq ?? failUndefined()
            }, entity.modelMeta.mutation.decode(update.mutation.data.mutation ?? failUndefined()));
          }
        }
      },
      err => {
        log(`Connection closed: ${err}`);
      }
    );
  }
}