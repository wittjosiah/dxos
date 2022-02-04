//
// Copyright 2020 DXOS.org
//

import { trigger } from './trigger';

/**
 * Times out after delay.
 */
export const sleep = (ms: number) => new Promise<void>((resolve) => {
  const finish = Date.now() + ms;

  // `setTimeout` does not guarantee execution at >= the scheduled time and may execute slightly early.
  const sleeper = () => {
    const delta = finish - Date.now();
    if (delta > 0) {
      setTimeout(sleeper, delta);
    } else {
      resolve();
    }
  };

  sleeper();
});

/**
 * @param [timeout] How long to wait, in milliseconds (0 = no timeout).
 */
export const promiseTimeout = <T = any>(promise: Promise<T>, timeout: number, error: Error): Promise<T> => {
  let cancelTimeout: any;

  const timeoutPromise = new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(error);
    }, timeout);

    cancelTimeout = () => {
      clearTimeout(timer);
    };
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    cancelTimeout();
  });
};

/**
 * Returns a Promise which resolves when `condFn` returns truthy. The value returned by
 * `condFn` is used to resolve the Promise.
 * @param [timeout] How long to wait, in milliseconds (0 = no timeout).
 * @param [interval=10] How frequently to check, in milliseconds.
 */
export const waitForCondition = (condFn: Function, timeout = 0, interval = 10) => {
  const stopTime = timeout ? Date.now() + timeout : 0;
  const [provider, resolver] = trigger<any>();
  const waiter = async () => {
    // eslint-disable-next-line no-unmodified-loop-condition
    while (!stopTime || Date.now() < stopTime) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const value = await condFn();
        if (value) {
          resolver(value);
          break;
        }
      } catch (e) {
        // Pass...
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(interval);
    }
  };

  setTimeout(waiter, 0);

  return timeout ? promiseTimeout(provider(), timeout, new Error('Timeout')) : provider();
};