//
// Copyright 2022 DXOS.org
//

import { SignRequest, SignResponse } from '@dxos/protocols/proto/dxos/client';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keys';

// TODO(burdon): Remove (was required for registry client).
export interface HaloSigner {
  sign: (request: SignRequest, key: KeyRecord) => Promise<SignResponse>;
}
