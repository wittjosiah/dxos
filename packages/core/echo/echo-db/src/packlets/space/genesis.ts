//
// Copyright 2022 DXOS.org
//

import { CredentialGenerator } from '@dxos/credentials';
import { Keyring } from '@dxos/keyring';
import { AdmittedFeed } from '@dxos/protocols/proto/dxos/halo/credentials';

import { Space } from './space';
import { SigningContext } from './space-manager';

export const spaceGenesis = async (keyring: Keyring, signingContext: SigningContext, space: Space) => {
  // Write genesis credentials.
  {
    const generator = new CredentialGenerator(keyring, signingContext.identityKey, signingContext.deviceKey);

    const credentials = [
      ...(await generator.createSpaceGenesis(space.key, space.controlFeedKey, signingContext.profile)),
      await generator.createFeedAdmission(space.key, space.dataFeedKey, AdmittedFeed.Designation.DATA)
    ];

    for (const credential of credentials) {
      await space.controlPipeline.writer.write({
        '@type': 'dxos.echo.feed.CredentialsMessage',
        credential
      });
    }
  }
};
