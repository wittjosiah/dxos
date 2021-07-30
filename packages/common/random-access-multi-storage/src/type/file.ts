//
// Copyright 2021 DXOS.org
//

import del from 'del';
import raf from 'random-access-file';

import { RandomAccessAbstract } from '../random-access-abstract';

/**
 * Node specific file storage.
 */
export class File extends RandomAccessAbstract {
  _create (filename: string, opts: any = {}) {
    return raf(filename, {
      directory: this._root,
      ...opts
    });
  }

  _destroy () {
    return del(this._root);
  }
}