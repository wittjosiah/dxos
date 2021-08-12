//
// Copyright 2021 DXOS.org
//

export interface Message {
  seq: number;
  data: Buffer;
}

export interface Feed {
  ready: any;
  key: Buffer;
  secretKey: Buffer;
  discoveryKey: Buffer;
  length: number;
  opened: Boolean;
  closed: Boolean;

  /**
   * Appends a block of data to the feed.
   * Callback is called with (err, seq) when all data has been written at the returned seq number or error will be not null.
   * @param data
   * @param callback
   */
  append(data: any, callback?: (err: Error | null, seq?: number) => void): void;

  /**
   * Gets a block of data. If the data is not available locally this method will prioritize and wait for the data to be downloaded before calling the callback.
   * @param index
   * @param callback
   */
  get(index: number, callback: (err: Error | null, data?: Message) => void): void;

  /**
   * Get a block of data. If the data is not available locally this method will prioritize and wait for the data to be downloaded before calling the callback.
   * @param index
   * @param options
   * @param callback
   */
  get(index: number, options: any, callback: (err: Error | null, data?: Message) => void): void;

  createReadStream(options?: any): NodeJS.ReadableStream;

  head: any;
  on: (s: string, cb: () => any) => any;
  removeListener: (s: string, cb: () => any) => any;
  getBatch: (n: number, maxMessages: number, cb: (err: Error, res: any) => any) => any;
}

export type Hypercore = (storage: any, key?: any, options?: any) => Feed;