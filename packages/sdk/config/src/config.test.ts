//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { test } from '@dxos/test';

import { Config, mapFromKeyValues, mapToKeyValues } from './config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaults = require('./testing/defaults.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const envmap = require('./testing/envs-map.json');

test('Empty config', () => {
  const config = new Config();

  expect(config.values).toBeTruthy();
  expect(config.get('runtime.props.title')).toBeUndefined();
});

test('Basic config', () => {
  const config = new Config(
    {
      runtime: {
        props: {
          title: 'testing'
        }
      }
    },
    {
      runtime: {
        app: {
          theme: 'light'
        }
      }
    }
  );

  expect(config.values).toEqual({
    version: 1,
    runtime: {
      app: {
        theme: 'light'
      },
      props: {
        title: 'testing'
      }
    }
  });
});

test('Runtime and module config', () => {
  const config = new Config(
    {
      package: {
        modules: [
          {
            name: 'example:app/tasks',
            record: {
              web: {
                entryPoint: 'main.js'
              }
            }
          }
        ]
      }
    },
    {
      runtime: {
        services: {
          signal: {
            server: 'ws://localhost:4000'
          }
        }
      }
    }
  );

  expect(config.values).toEqual({
    version: 1,
    package: {
      modules: [
        {
          name: 'example:app/tasks',
          record: {
            web: {
              entryPoint: 'main.js'
            }
          }
        }
      ]
    },
    runtime: {
      services: {
        signal: {
          server: 'ws://localhost:4000'
        }
      }
    }
  });
});

test.skip('Mapping', () => {
  process.env.TEST_CLIENT_ID = '900';
  process.env.TEST_SERVER_ENDPOINT = 'http://localhost';

  const config = new Config(
    {
      runtime: {
        client: {
          tag: 'testing'
        }
      }
    } as any,
    mapFromKeyValues(envmap, process.env)
  );

  expect(config.values).toEqual({
    runtime: {
      client: {
        id: 900,
        tag: 'testing'
      },
      server: {
        endpoint: 'http://localhost'
      }
    }
  });

  const values = mapToKeyValues(envmap, config.values);

  expect(values).toEqual({
    TEST_CLIENT_ID: 900,
    TEST_CLIENT_TAG: 'testing',
    TEST_SERVER_ENDPOINT: 'http://localhost'
  });
});

test.skip('mapToKeyValuesping', () => {
  const config = new Config(
    {
      client: {
        tag: 'testing'
      }
    } as any,
    defaults as any
  );

  const values = mapToKeyValues(envmap, config.values);

  expect(values).toEqual({
    TEST_CLIENT_ID: 123,
    TEST_CLIENT_TAG: 'testing'
  });
});
