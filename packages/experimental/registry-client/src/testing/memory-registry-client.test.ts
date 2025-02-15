//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { beforeAll, describe, test } from '@dxos/test';

import { AccountKey, CID, DXN, RegistryClient } from '../api';
import { createDXN, registerMockRecord, registerMockResource, registerMockTypes } from './fake-data-generator';
import { MemoryRegistryClientBackend } from './memory-registry-client';

describe('Registry API mock', () => {
  let mock: MemoryRegistryClientBackend;
  let records: CID[];
  let names: DXN[];

  beforeAll(async () => {
    mock = new MemoryRegistryClientBackend();
    const registry = new RegistryClient(mock);
    const owner = AccountKey.random();
    await Promise.all(faker.datatype.array(5).map(() => mock.registerDomainName('example', owner)));

    const types = await registerMockTypes(registry);

    records = await Promise.all(
      faker.datatype.array(30).map(() =>
        registerMockRecord(registry, {
          typeRecord: faker.random.arrayElement(types)
        })
      )
    );

    names = records.map(() => createDXN());
    await Promise.all(
      records.map((record, index) =>
        registerMockResource(registry, {
          name: names[index],
          record,
          owner
        })
      )
    );
  });

  test('Returns a specific resource', async () => {
    const name = names[0];
    const resource = await mock.getResource(name);

    expect(resource!.toString()).to.equal(records[0]!.toString());
  });

  test('Returns resources', async () => {
    const resources = await mock.listResources();

    expect(resources.length).to.be.equal(30);
  });

  test('Returns records', async () => {
    const records = await mock.listRecords();

    expect(records.length).to.be.equal(36);
  });
});
