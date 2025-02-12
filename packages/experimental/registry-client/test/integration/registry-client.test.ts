//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import protobuf from 'protobufjs';

import { schemaJson } from '@dxos/protocols';
import { App } from '@dxos/protocols/proto/dxos/type';
import { afterEach, beforeEach, describe, test } from '@dxos/test';

import { createCID, AccountKey, CID, DomainKey, DXN, PolkadotRegistry, RegistryClient } from '../../src';
import { setupRegistryClient } from './utils';

chai.use(chaiAsPromised);

const protoSchema = protobuf.Root.fromJSON(schemaJson);

const randomName = () => `r${Math.random().toString(36).substring(2)}`;

describe('Registry Client', () => {
  let registryBackend: PolkadotRegistry;
  let registryClient: RegistryClient;
  let apiPromise: ApiPromise;
  let account: AccountKey;

  beforeEach(async () => {
    const setupResult = await setupRegistryClient();
    apiPromise = setupResult.apiPromise;
    registryBackend = setupResult.registryBackend;
    registryClient = setupResult.registryClient;
    account = await setupResult.accountsClient.createAccount();
  });

  afterEach(async () => {
    await apiPromise.disconnect();
  });

  describe('Types', () => {
    test('Adds type to registry', async () => {
      const hash = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);
      expect(hash.value.length).to.be.greaterThan(0);
    });

    test('Retrieves a list of types', async () => {
      const types = await registryClient.listTypeRecords();
      expect(types.length).to.be.greaterThan(0);
    });

    test('Retrieves type details', async () => {
      const domainKey = await registryClient.registerAuthority(account);
      const typeCid = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);
      await registryClient.registerResource(DXN.fromDomainKey(domainKey, randomName(), 'latest'), typeCid, account);

      const typeRecord = await registryClient.getTypeRecord(typeCid);
      expect(typeRecord?.type?.messageName).to.equal('.dxos.type.App');
      expect(typeRecord?.type?.protobufDefs.lookupType('.dxos.type.App')).to.not.be.undefined;
    });
  });

  describe('Domains', () => {
    test('Retrieves a list of domains', async () => {
      const domains = await registryClient.listAuthorities();
      expect(domains.length).to.be.greaterThan(0);
    });
  });

  describe('Resources', () => {
    let appTypeCid: CID;
    let contentCid: CID;
    const appResourceName = 'app';
    let domainKey: DomainKey;

    beforeEach(async () => {
      appTypeCid = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);

      contentCid = await registryClient.registerRecord(
        {
          appName: 'Tasks App',
          appVersion: 5,
          hasSso: false
        },
        appTypeCid
      );

      domainKey = await registryClient.registerAuthority(account);
      await registryClient.registerResource(
        DXN.fromDomainKey(domainKey, appResourceName, 'latest'),
        contentCid,
        account
      );
    });

    test('Retrieves a list of resources', async () => {
      const resources = await registryClient.listResources();
      expect(resources.length).to.be.greaterThan(0);
    });

    test('Queries by type, when matching, returns matching items', async () => {
      const resources = await registryClient.listResources({
        text: appResourceName
      });
      expect(resources.length).to.be.greaterThan(0);
    });

    test('Queries by type, when not matching, returns empty', async () => {
      const resources = await registryClient.listResources({ text: 'mybot' });
      expect(resources).to.be.empty;
    });

    test('Retrieves a single resource', async () => {
      const id = DXN.fromDomainKey(domainKey, appResourceName);
      const resource = await registryClient.getResource(id);
      expect(resource!.toString()).to.be.equal(contentCid.toString());
    });

    test('Deletes a single resource', async () => {
      const name = DXN.fromDomainKey(domainKey, appResourceName, 'latest');
      await registryClient.registerResource(name, undefined, account);
      const resource = await registryClient.getResource(name);
      expect(resource).to.be.undefined;
    });

    describe('Tags and versions', () => {
      const versionedName = 'versionedApp';
      let version2: CID;
      let version3: CID;
      let version4: CID;
      let name: DXN;

      beforeEach(async () => {
        version2 = await registryClient.registerRecord(
          {
            appName: 'Versioned App',
            appVersion: 2,
            hasSso: false
          },
          appTypeCid
        );
        version3 = await registryClient.registerRecord(
          {
            appName: 'Versioned App',
            appVersion: 3,
            hasSso: false
          },
          appTypeCid
        );
        version4 = await registryClient.registerRecord(
          {
            appName: 'Versioned App',
            appVersion: 4,
            hasSso: false
          },
          appTypeCid
        );

        name = DXN.fromDomainKey(domainKey, versionedName);
        await registryClient.registerResource(name.with({ tag: 'latest' }), version4, account);
        await registryClient.registerResource(name.with({ tag: 'beta' }), version2, account);
        await registryClient.registerResource(name.with({ tag: 'alpha' }), version3, account);
      });

      test('Properly Registers resource with tags and versions', async () => {
        const latestCid = await registryClient.getResource(name);
        expect(latestCid!.toString()).to.be.equal(version4.toString());
        const alphaCid = await registryClient.getResource(name.with({ tag: 'alpha' }));
        expect(alphaCid!.toString()).to.be.equal(version3.toString());
        const betaCid = await registryClient.getResource(name.with({ tag: 'beta' }));
        expect(betaCid!.toString()).to.be.equal(version2.toString());
      });

      test('queries by tag', async () => {
        const taggedDxn = DXN.fromDomainKey(domainKey, versionedName, 'alpha');
        const record = await registryClient.getRecordByName(taggedDxn);
        expect(record).to.not.be.undefined;
      });
    });
  });

  describe('Data records', () => {
    test('Register a record of your custom type', async () => {
      const appTypeCid = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);

      const appData: App = {
        repos: [],
        web: {
          entryPoint: './path/to/main.js'
        }
      };
      const appCid = await registryClient.registerRecord(appData, appTypeCid);

      const appRecord = await registryClient.getRecord(appCid);
      expect(appRecord?.payload).to.deep.equal({
        '@type': appTypeCid,
        ...appData
      });
    });

    test('Register a record with nested extensions', async () => {
      const serviceTypeCid = await registryClient.registerTypeRecord('.dxos.type.Service', protoSchema);
      const ipfsTypeCid = await registryClient.registerTypeRecord('.dxos.type.IPFS', protoSchema);

      const serviceData = {
        type: 'ipfs',
        kube: createCID().value,
        extension: {
          '@type': ipfsTypeCid,
          protocol: 'ipfs/0.1.0',
          addresses: ['/ip4/123.123.123.123/tcp/5566']
        }
      };
      const recordCid = await registryClient.registerRecord(serviceData, serviceTypeCid);

      const appRecord = await registryClient.getRecord(recordCid);
      expect(appRecord?.payload).to.deep.equal({
        '@type': serviceTypeCid,
        ...serviceData
      });
    });

    test('invalid records are ignored by list methods', async () => {
      const cid = await registryBackend.registerRecordBytes(Buffer.from('10200300040000', 'hex'));

      const records = await registryClient.listRecords();
      expect(records.every((record) => !record.cid.equals(cid))).to.be.true;

      const resources = await registryClient.listResources();
      expect(
        resources.every((resource) => {
          const tags = Object.values(resource.tags).map((tag) => tag?.toString() ?? '');
          return !tags.includes(cid.toString());
        })
      ).to.be.true;
    });

    test('Records has date fields decoded properly', async () => {
      for (const record of await registryClient.listRecords()) {
        expect(record.created?.toString()).to.not.equal('Invalid Date');
      }
    });

    describe('Querying', () => {
      let appTypeCid: CID;
      let botTypeCid: CID;

      beforeEach(async () => {
        appTypeCid = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);
        botTypeCid = await registryClient.registerTypeRecord('.dxos.type.Bot', protoSchema);

        const appCid = await registryClient.registerRecord(
          {
            appName: 'Tasks App',
            appVersion: 5,
            hasSso: false
          },
          appTypeCid
        );
        await registryClient.getRecord(appCid);
      });

      test('Queries records by type, when matching, returns matching items', async () => {
        const records = await registryClient.listRecords({ type: appTypeCid });
        expect(records.length).to.be.equal(1);
      });

      test('Queries records by type, when not matching, returns empty', async () => {
        const resources = await registryClient.listRecords({
          type: botTypeCid
        });
        expect(resources).to.be.empty;
      });
    });
  });

  describe('Register name', () => {
    test('Assigns a name to a type', async () => {
      const domainKey = await registryClient.registerAuthority(account);

      const appTypeCid = await registryClient.registerTypeRecord('.dxos.App', protoSchema);

      await expect(
        registryClient.registerResource(DXN.fromDomainKey(domainKey, randomName(), 'latest'), appTypeCid, account)
      ).to.be.fulfilled;
    });

    test('Does allow to overwrite already registered name', async () => {
      const domainKey = await registryClient.registerAuthority(account);

      const appTypeCid = await registryClient.registerTypeRecord('.dxos.type.App', protoSchema);

      await expect(
        registryClient.registerResource(DXN.fromDomainKey(domainKey, randomName(), 'latest'), appTypeCid, account)
      ).to.be.fulfilled;

      await expect(
        registryClient.registerResource(DXN.fromDomainKey(domainKey, randomName(), 'latest'), appTypeCid, account)
      ).to.be.fulfilled;
    });
  });

  describe('Register domain', () => {
    test('Allows to register a free domain without a vanity name', async () => {
      await expect(registryClient.registerAuthority(account)).to.be.fulfilled;
    });
  });
});
